import { initializeApp } from "firebase/app"

import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore"
import { DiscordRequestCommunity } from "../../modules/utils.js"
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

function formatGame(g) {
  const comp = g.competitions[0]
  const homeTeam = comp.competitors.find((c) => c.homeAway === "home")
  const awayTeam = comp.competitors.find((c) => c.homeAway === "away")
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

exports.handler = async function (event, context) {
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
  console.log(polls)

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
    .map((g) => {
      const id = g.id
      const comp = g.competitions[0]
      const homeTeam = comp.competitors.find((c) => c.homeAway === "home")
      const awayTeam = comp.competitors.find((c) => c.homeAway === "away")
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
    const _ = await DiscordRequestCommunity(`channels/${channel}/messages`, {
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
    while (messageCount < gameMessages.length) {
      const currentGame = gameMessages[messageCount]
      const m = await DiscordRequestCommunity(
        `channels/${channel}/messages`,
        {
          method: "POST",
          body: {
            content: currentGame.message,
            allowed_mentions: {
              parse: [],
            },
          },
        },
        (maxTries = 40)
      )
      const jsonRes = await m.json()
      const messageId = jsonRes.id
      reactions.push({ messageId, emoji: currentGame.awayEmoji })
      reactions.push({ messageId, emoji: currentGame.homeEmoji })
      polls.nfl[`week${week}`][currentGame.id] = messageId
      messageCount = messageCount + 1
    }
    let reactionCount = 0
    while (reactionCount < reactions.length) {
      const currentReaction = reactions[reactionCount]
      const emoji = `${currentReaction.emoji}%3A${
        emojiDoc.nfl.emojis[currentReaction.emoji]
      }`
      await DiscordRequestCommunity(
        `channels/${channel}/messages/${currentReaction.messageId}/reactions/${emoji}/@me`,
        {
          method: "PUT",
        },
        (maxTries = 100)
      )
      reactionCount = reactionCount + 1
    }
    await setDoc(doc(db, "polls", guild_id), polls, { merge: true })
    console.log("set game messages for current week")
  } else {
    // update the poll messages
    let messageCount = 0
    while (messageCount < gameMessages.length) {
      const currentGame = gameMessages[messageCount]
      const m = await DiscordRequestCommunity(
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
        },
        (maxTries = 100)
      )
      const jsonRes = await m.json()
      const messageId = jsonRes.id
      polls.nfl[`week${week}`][currentGame.id] = messageId
      messageCount = messageCount + 1
    }
  }
}
