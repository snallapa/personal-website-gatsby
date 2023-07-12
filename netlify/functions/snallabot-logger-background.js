import { DiscordRequestProd } from "../../modules/utils.js"
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

async function getMessages(channelId) {
  let messages = await DiscordRequestProd(
    `/channels/${channelId}/messages?limit=100`,
    {
      method: "GET",
    }
  ).then((r) => r.json())
  let newMessages = messages
  // feels like setting a max is a good idea. 1000 messages
  let page = 0
  const maxPage = 10
  while (newMessages.length === 100 && page < 10) {
    const lastMessage = messages[messages.length - 1]
    newMessages = await DiscordRequestProd(
      `/channels/${channelId}/messages?limit=100&before=${lastMessage.id}`,
      {
        method: "GET",
      }
    ).then((r) => r.json())
    messages = messages.concat(newMessages)
    page = page + 1
  }
  return messages.reverse()
}

exports.handler = async function (event, context) {
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
    await DiscordRequestProd(`channels/${logChannel}/messages`, {
      method: "POST",
      body: {
        content: `${log.command} by <@${log.user}>`,
        allowed_mentions: {
          parse: [],
        },
      },
    })
  } else if (log.logType === "CHANNEL") {
    const channelId = log.channelId
    const channelMessages = await getMessages(channelId).then((messages) => {
      return messages.map((m) => ({
        content: m.content,
        user: m.author.id,
      }))
    })
    const logMessages = channelMessages.concat(log.additionalMessages || [])
    const res1 = await DiscordRequestProd(`channels/${channelId}`, {
      method: "GET",
    })
    const channel = await res1.json()
    const channelName = channel.name
    await DiscordRequestProd(`/channels/${channelId}`, { method: "DELETE" }) // delete channel once we have all the info
    const res = await DiscordRequestProd(`channels/${logChannel}/threads`, {
      method: "POST",
      body: {
        name: `${channelName} channel log`,
        auto_archive_duration: 60,
        type: 11,
      },
    })
    const thread = await res.json()
    const threadId = thread.id
    const messagePromise = logMessages.reduce((p, message) => {
      return p.then((_) =>
        DiscordRequestProd(`channels/${threadId}/messages`, {
          method: "POST",
          body: {
            content: `<@${message.user}>: ${message.content}`,
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
