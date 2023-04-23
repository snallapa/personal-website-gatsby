import fetch from "node-fetch"
import { initializeApp } from "firebase/app"
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
} from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDf9ZiTBWf-sWY007WsKktMPewcrs07CWw",
  authDomain: "championslounge-f0f36.firebaseapp.com",
  projectId: "championslounge-f0f36",
  storageBucket: "championslounge-f0f36.appspot.com",
  messagingSenderId: "163156624093",
  appId: "1:163156624093:web:dfe860c8bb38a62b075134",
}

const SNALLABOT_USER = "970091866450198548"

const app = initializeApp(firebaseConfig)

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app)

async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = "https://discord.com/api/v9/" + endpoint
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body)
  // Use node-fetch to make requests
  let tries = 0
  const maxTries = 5
  while (tries < maxTries) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      ...options,
    })
    if (!res.ok) {
      const data = await res.json()
      if (data["retry_after"]) {
        tries = tries + 1
        await new Promise(r => setTimeout(r, data["retry_after"] * 1000))
      } else {
        console.log(data)
        throw new Error(JSON.stringify(data))
      }
    } else {
      return res
    }
  }
}

exports.handler = async function(event, context) {
  const log = JSON.parse(event.body)
  const guild_id = log.guild_id
  const docRef = doc(db, "leagues", guild_id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    console.log(`no league found for ${guild_id}`)
    return
  }
  let league = docSnap.data()

  const logChannel = league.commands.logger.channel || {}
  if (log.logType === "COMMAND") {
    await DiscordRequest(`channels/${logChannel}/messages`, {
      method: "POST",
      body: {
        content: `${log.command} by <@${log.user}>`,
        allowed_mentions: {
          parse: [],
        },
      },
    })
  } else if (log.logType === "CHANNEL") {
    const res = await DiscordRequest(`channels/${logChannel}/threads`, {
      method: "POST",
      body: {
        name: `${log.channelName} channel log`,
        auto_archive_duration: 60,
        type: 11,
      },
      allowed_mentions: {
        parse: [],
      },
    })
    const thread = await res.json()
    const threadId = thread.id
    const messagePromise = log.messages.reduce((p, message) => {
      return p.then(_ =>
        DiscordRequest(`channels/${threadId}/messages`, {
          method: "POST",
          body: {
            content: `${message.content} by <@${message.user}>`,
            allowed_mentions: {
              parse: [],
            },
          },
        })
      )
    }, Promise.resolve())
    await messagePromise
  }
}
