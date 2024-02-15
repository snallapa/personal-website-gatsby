import { initializeApp } from "firebase/app"

import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore"

import { DiscordRequestProd } from "../../modules/utils.js"

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

const reservedLeagues = ["guild_updates", "mca"]

function formatStats(stats) {
  const statStrings = []
  statStrings.push(`**Total Servers:** ${stats.totalBotServers}`)
  statStrings.push(`**Total Madden Leagues:** ${stats.totalMaddenLeagues}`)
  statStrings.push(
    `**Total Snallabot Dashboard Leagues:** ${stats.totalDashboardLeagues}`
  )
  statStrings.push(
    `**Total Game Channel Notifier Leagues:** ${stats.totalGameChannelNotifierLeagues}`
  )
  statStrings.push(`**Total Team Role Leagues:** ${stats.totalTeamRoleLeagues}`)
  statStrings.push(`**Total Logger Leagues:** ${stats.totalLoggerLeagues}`)
  statStrings.push(
    `**Total Stream Counts Leagues:** ${stats.totalStreamCountsLeagues}`
  )
  return statStrings.join("\n")
}

exports.handler = async function (event, context) {
  const res = await DiscordRequestProd("users/@me/guilds", { method: "GET" })
  const pagedGuilds = await res.json()
  let guilds = pagedGuilds.map((g) => g.id)
  let paging = true
  while (paging) {
    const lastGuild = guilds[guilds.length - 1]
    const res = await DiscordRequestProd(
      `users/@me/guilds?after=${lastGuild}`,
      {
        method: "GET",
      }
    )
    const pagedGuilds = await res.json()
    if (pagedGuilds.length === 0) {
      paging = false
    } else {
      guilds = guilds.concat(pagedGuilds.map((g) => g.id))
    }
  }
  console.log(`number of servers: ${guilds.length}`)

  const querySnapshot = await getDocs(collection(db, "leagues"))

  console.log(`number of firebase leagues: ${querySnapshot.size}`)
  const stats = {
    totalBotServers: guilds.length,
    totalMaddenLeagues: 0,
    totalDashboardLeagues: 0,
    totalGameChannelNotifierLeagues: 0,
    totalTeamRoleLeagues: 0,
    totalLoggerLeagues: 0,
    totalStreamCountsLeagues: 0,
  }

  const deletePromises = querySnapshot.docs.flatMap((fDoc) => {
    if (!guilds.includes(fDoc.id) && !reservedLeagues.includes(fDoc.id)) {
      console.log(`deleting league ${fDoc.id}`)
      const update = {}
      update["gameChannels"] = {}
      update["gameChannels"][fDoc.id] = false
      update["teams"] = {}
      update["teams"][fDoc.id] = false
      return [
        deleteDoc(doc(db, "leagues", fDoc.id)),
        setDoc(doc(db, "leagues", "guild_updates"), update, {
          merge: true,
        }),
      ]
    } else {
      const leagueData = fDoc.data()
      if (leagueData.schedules?.reg) {
        stats.totalMaddenLeagues += 1
      }
      if (leagueData.madden_server?.leagueId) {
        stats.totalDashboardLeagues += 1
      }
      if (leagueData.commands?.game_channels?.autoUpdate) {
        stats.totalGameChannelNotifierLeagues += 1
      }
      if (leagueData.commands?.teams?.autoUpdate) {
        stats.totalTeamRoleLeagues += 1
      }
      if (leagueData.commands?.logger?.on) {
        stats.totalLoggerLeagues += 1
      }
      if (leagueData.commands?.streams?.channel) {
        stats.totalStreamCountsLeagues += 1
      }
    }
    return []
  })

  await Promise.all(deletePromises)
  await DiscordRequestProd(`channels/1207476843373010984/messages`, {
    method: "POST",
    body: {
      content: `# Snallabot Daily Stats\n${formatStats(stats)}`,
      allowed_mentions: {
        parse: [],
      },
    },
  })

  return {
    statusCode: 200,
  }
}
