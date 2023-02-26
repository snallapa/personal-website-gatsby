import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions"
import { initializeApp } from "firebase/app"

import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore"

import fetch from "node-fetch"

const firebaseConfig = {
  apiKey: "AIzaSyDf9ZiTBWf-sWY007WsKktMPewcrs07CWw",
  authDomain: "championslounge-f0f36.firebaseapp.com",
  projectId: "championslounge-f0f36",
  storageBucket: "championslounge-f0f36.appspot.com",
  messagingSenderId: "163156624093",
  appId: "1:163156624093:web:dfe860c8bb38a62b075134",
}

function VerifyDiscordRequest(clientKey) {
  return function(event) {
    const signature = event.headers["x-signature-ed25519"]
    const timestamp = event.headers["x-signature-timestamp"]
    const isValidRequest = verifyKey(
      event.body,
      signature,
      timestamp,
      clientKey
    )
    return isValidRequest
  }
}

const verifier = VerifyDiscordRequest(process.env.PUBLIC_KEY_COMMUNITY)

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app)

async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = "https://discord.com/api/v9/" + endpoint
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body)
  // Use node-fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN_COMMUNITY}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    ...options,
  })

  // throw API errors
  if (!res.ok) {
    const data = await res.json()
    console.log(res)
    throw new Error(JSON.stringify(data))
  }
  // return original response
  return res
}

function respond(
  message,
  statusCode = 200,
  interactionType = InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE
) {
  return {
    statusCode: statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: interactionType,
      data: {
        content: message,
      },
    }),
  }
}

exports.handler = async function(event, context) {
  if (!verifier(event)) {
    return {
      statusCode: 401,
    }
  }
  // console.log(event)
  const { type, guild_id, data } = JSON.parse(event.body)
  if (type === InteractionType.PING) {
    return {
      statusCode: 200,
      body: JSON.stringify({ type: InteractionResponseType.PONG }),
    }
  }
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data
    if (name === "test_community") {
      console.log("test command received!")
      return respond("bot is working!")
    } else if (name === "setup_nfl_polls") {
      const channel = options[0].value
      const auto = options[1] ? options[1].value : false
      await setDoc(
        doc(db, "polls", guild_id),
        {
          nfl: {
            channel: channel,
          },
        },
        { merge: true }
      )
      const guilds = {}
      guilds[guild_id] = auto
      await setDoc(
        doc(db, "polls", "guild_updates"),
        {
          nfl: {
            guilds,
          },
        },
        { merge: true }
      )
      return respond("configured channel!")
    } else if (name === "setup_nba_polls") {
      const channel = options[0].value
      const auto = options[1] ? options[1].value : false
      await setDoc(
        doc(db, "polls", guild_id),
        {
          nba: {
            channel: channel,
          },
        },
        { merge: true }
      )
      const guilds = {}
      guilds[guild_id] = auto
      await setDoc(
        doc(db, "polls", "guild_updates"),
        {
          nba: {
            guilds,
          },
        },
        { merge: true }
      )
      return respond("configured channel!")
    } else if (name === "manual_update_nfl") {
      const docRef = doc(db, "polls", guild_id)
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        return respond(
          `no community found for ${guild_id}, do /setup_nfl_polls first`
        )
      }
      const polls = docSnap.data()
      // fail this early
      try {
        const channel = polls.nfl.channel
      } catch (error) {
        return respond("missing configuration, run `/setup_nfl_polls` first")
      }

      const res = await fetch(
        "https://nallapareddy.com/.netlify/functions/community-background",
        {
          method: "POST",
          body: JSON.stringify({
            guild_id: guild_id,
          }),
        }
      )
      if (res.ok) {
        return respond("creating polls shortly!")
      } else {
        console.log(res)
        return respond(
          "something went wrong :( I am not sure if polls will be created maybe ask owner"
        )
      }
    } else if (name === "manual_update_nba") {
      const docRef = doc(db, "polls", guild_id)
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        return respond(
          `no community found for ${guild_id}, do /setup_nba_polls first`
        )
      }
      const polls = docSnap.data()
      // fail this early
      try {
        const channel = polls.nba.channel
      } catch (error) {
        return respond("missing configuration, run `/setup_nba_polls` first")
      }

      const res = await fetch(
        "https://nallapareddy.com/.netlify/functions/community-nba-background",
        {
          method: "POST",
          body: JSON.stringify({
            guild_id: guild_id,
          }),
        }
      )
      if (res.ok) {
        return respond("creating polls shortly!")
      } else {
        console.log(res)
        return respond(
          "something went wrong :( I am not sure if polls will be created maybe ask owner"
        )
      }
    }
  }
  return respond(
    "we should not have gotten here... this command is broken contact owner"
  )
}
