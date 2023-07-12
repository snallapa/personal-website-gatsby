import { initializeApp } from "firebase/app"

import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore"

import { DiscordRequestCommunity } from "../../modules/utils.js"

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

async function gamePoll(polls, emojiDoc, guild_id, currentGame) {
  const channel = polls.nba.channel
  if (!polls.nba.games[currentGame.id]) {
    const m = await DiscordRequestCommunity(`channels/${channel}/messages`, {
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
    polls.nba.games[currentGame.id] = messageId
    const homeEmoji = `${currentGame.homeEmoji}%3A${
      emojiDoc.emojis[currentGame.homeEmoji]
    }`
    const awayEmoji = `${currentGame.awayEmoji}%3A${
      emojiDoc.emojis[currentGame.awayEmoji]
    }`
    await DiscordRequestCommunity(
      `channels/${channel}/messages/${messageId}/reactions/${awayEmoji}/@me`,
      {
        method: "PUT",
      }
    )
    await DiscordRequestCommunity(
      `channels/${channel}/messages/${messageId}/reactions/${homeEmoji}/@me`,
      {
        method: "PUT",
      }
    )
  } else {
    const m = await DiscordRequestCommunity(
      `channels/${channel}/messages/${polls.nba.games[currentGame.id]}`,
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
    polls.nba.games[currentGame.id] = messageId
  }
  await setDoc(doc(db, "polls", guild_id), polls, { merge: true })
  return true
}

exports.handler = async function (event, context) {
  // console.log(event)
  const { guild_id } = JSON.parse(event.body)
  const docRef = doc(db, "polls", guild_id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    console.log(`no community found for ${guild_id}, do /setup_nba_polls first`)
  }
  const polls = docSnap.data()
  console.log(polls)
  const emojiRef = doc(db, "polls", "nba_emojis")
  const emojiSnap = await getDoc(emojiRef)
  const emojiDoc = emojiSnap.data()
  console.log(polls)

  const res = await fetch(
    "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
  )
  const data = await res.json()
  const games = data.events

  let channel
  try {
    channel = polls.nba.channel
  } catch (error) {
    return console.log("missing configuration, run `/setup_nba_polls` first")
  }

  polls.nba.games = polls.nba.games || {}
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
  for (let i = 0; i < gameMessages.length; i++) {
    const g = gameMessages[i]
    await gamePoll(polls, emojiDoc, guild_id, g)
  }
}
