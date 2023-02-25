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

function formatGame(g) {
  const comp = g.competitions[0]
  const homeTeam = comp.competitors.find(c => c.homeAway === "home")
  const awayTeam = comp.competitors.find(c => c.homeAway === "away")
  const status = comp.status.type.name
  const schedule = comp.status.type.shortDetail
  if (status === "STATUS_FINAL") {
    if (homeTeam.winner) {
      return `${awayTeam.team.displayName} ${awayTeam.score} - **${homeTeam.score} ${homeTeam.team.displayName}** **__FINAL__**`
    } else if (awayTeam.winner) {
      return `**${awayTeam.team.displayName} ${awayTeam.score}** - ${homeTeam.score} ${homeTeam.team.displayName} **__FINAL__**`
    } else {
      return `${awayTeam.team.displayName} ${awayTeam.score} - ${homeTeam.score} ${homeTeam.team.displayName} **__FINAL__**`
    }
  } else if (status === "STATUS_SCHEDULED") {
    return `${awayTeam.team.displayName} - ${homeTeam.team.displayName} ${schedule}`
  }
  return `${awayTeam.team.displayName} ${awayTeam.score} - ${homeTeam.score} ${homeTeam.team.displayName}`
}

exports.handler = async function(event, context) {
  // console.log(event)
  const { guild_id } = JSON.parse(event.body)
  const docRef = doc(db, "polls", guild_id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    console.log(`no community found for ${guild_id}, do /setup_nfl_polls first`)
  }
  const polls = docSnap.data()
  console.log(polls)
  const emojiRef = doc(db, "polls", "972269092440530994")
  const emojiSnap = await getDoc(emojiRef)
  const emojiDoc = emojiSnap.data()

  const res = await fetch(
    "http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
  )
  const data = await res.json()
  const week = data.week.number
  const games = data.events

  let channel
  try {
    channel = polls.nfl.channel
  } catch (error) {
    return console.log("missing configuration, run `/setup_nfl_polls` first")
  }

  const gameMessages = games
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(g => {
      const id = g.id
      const comp = g.competitions[0]
      const homeTeam = comp.competitors.find(c => c.homeAway === "home")
      const awayTeam = comp.competitors.find(c => c.homeAway === "away")
      const awayEmoji = `snallabot_${awayTeam.team.abbreviation.toLowerCase()}`
      const homeEmoji = `snallabot_${homeTeam.team.abbreviation.toLowerCase()}`
      return {
        id,
        message: formatGame(g),
        awayEmoji,
        homeEmoji,
      }
    })

  if (!polls.nfl[`week${week}`]) {
    // create the poll messages
    // header for games
    const _ = await DiscordRequest(`channels/${channel}/messages`, {
      method: "POST",
      body: {
        content: `**__Week ${week} Games__**`,
        allowed_mentions: {
          parse: [],
        },
      },
    })
    polls.nfl[`week${week}`] = {}
    let messageCount = 0
    const reactions = []
    let tries = 0
    while (messageCount < gameMessages.length && tries < 40) {
      const currentGame = gameMessages[messageCount]
      try {
        const m = await DiscordRequest(`channels/${channel}/messages`, {
          method: "POST",
          body: {
            content: currentGame.message,
            allowed_mentions: {
              parse: [],
            },
          },
        })
        const jsonRes = await m.json()
        const messageId = jsonRes.id
        reactions.push({ messageId, emoji: currentGame.awayEmoji })
        reactions.push({ messageId, emoji: currentGame.homeEmoji })
        polls.nfl[`week${week}`][currentGame.id] = messageId
        messageCount = messageCount + 1
      } catch (e) {
        tries = tries + 1
        console.log(e)
        const error = JSON.parse(e.message)
        if (error["retry_after"]) {
          await new Promise(r => setTimeout(r, error["retry_after"] * 1000))
          console.log(`game messages retries: ${tries}`)
        }
      }
    }
    let reactionCount = 0
    tries = 0
    while (reactionCount < reactions.length && tries < 100) {
      const currentReaction = reactions[reactionCount]
      const emoji = `${currentReaction.emoji}%3A${
        emojiDoc.nfl.emojis[currentReaction.emoji]
      }`
      try {
        await DiscordRequest(
          `channels/${channel}/messages/${currentReaction.messageId}/reactions/${emoji}/@me`,
          {
            method: "PUT",
          }
        )
        reactionCount = reactionCount + 1
      } catch (e) {
        tries = tries + 1
        console.log(e)
        const error = JSON.parse(e.message)
        if (error["retry_after"]) {
          await new Promise(r => setTimeout(r, error["retry_after"] * 1000))
        }
        console.log(`reaction tries: ${tries}`)
      }
    }
    await setDoc(doc(db, "polls", guild_id), polls, { merge: true })
    console.log("set game messages for current week")
  } else {
    // update the poll messages
    let messageCount = 0
    let tries = 0
    while (messageCount < gameMessages.length && tries < 100) {
      const currentGame = gameMessages[messageCount]
      try {
        const m = await DiscordRequest(
          `channels/${channel}/messages/${
            polls.nfl[`week${week}`][currentGame.id]
          }`,
          {
            method: "PATCH",
            body: {
              content: currentGame.message,
              allowed_mentions: {
                parse: [],
              },
            },
          }
        )
        const jsonRes = await m.json()
        const messageId = jsonRes.id
        polls.nfl[`week${week}`][currentGame.id] = messageId
        messageCount = messageCount + 1
      } catch (e) {
        console.log(e)
        const error = JSON.parse(e.message)
        if (error["retry_after"]) {
          await new Promise(r => setTimeout(r, error["retry_after"] * 1000))
        }
        tries = tries + 1
      }
    }
  }
}
