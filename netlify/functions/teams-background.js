import { initializeApp } from "firebase/app"

import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore"

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

function formatWithDivision(teams) {
  const divisions = {}
  for (let key in teams) {
    const currentTeam = teams[key]
    const currentDivision = currentTeam.division
    if (divisions.hasOwnProperty(currentDivision)) {
      divisions[currentDivision].push(currentTeam)
    } else {
      divisions[currentDivision] = [currentTeam]
    }
  }
  const openTeams = []
  let message = Object.keys(divisions)
    .sort()
    .reduce((message, division) => {
      message = message + `__**${division}**__\n`
      const teams = divisions[division]
      return teams.reduce((m, t) => {
        m =
          m +
          `${t.teamName}: ${
            t.discordUser ? "<@" + t.discordUser + ">" : "OPEN"
          }\n`
        if (!t.discordUser) {
          openTeams.push(t)
        }
        return m
      }, message)
    }, "")
  message = message + "\n"
  message =
    message + `OPEN TEAMS: ${openTeams.map((t) => t.teamName).join(", ")}`
  return message
}

function formatNormal(teams) {
  const messageTeams = {}
  for (let key in teams) {
    const currentTeam = teams[key]
    messageTeams[currentTeam.teamName] = currentTeam.discordUser
  }
  const openTeams = []
  let message = Object.keys(messageTeams)
    .sort()
    .reduce((message, team) => {
      const dUser = messageTeams[team]
      if (!dUser) {
        openTeams.push(team)
      }
      return message + `${team}: ${dUser ? "<@" + dUser + ">" : "OPEN"}\n`
    }, "")
  message = message + "\n"
  message =
    message + `OPEN TEAMS: ${openTeams.map((t) => t.teamName).join(", ")}`
  return message
}

function createTeamsMessage(teams) {
  const k = Object.keys(teams)[0]
  if (teams[k].hasOwnProperty("division")) {
    return formatWithDivision(teams)
  } else {
    return formatNormal(teams)
  }
}

exports.handler = async function (event, context) {
  // console.log(event)
  const { guild_id, users } = JSON.parse(event.body)
  const docRef = doc(db, "leagues", guild_id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    console.log(`no league found for ${guild_id}?`)
    return
  }
  const league = docSnap.data()
  const teamIds = Object.keys(league.teams)
  teamIds.forEach((tId) => {
    const team = league.teams[tId]
    if (team.trackingRole) {
      const teamUser = users.filter((u) => u.roles.includes(team.trackingRole))
      if (teamUser.length === 0) {
        league.teams[tId].discordUser = ""
      } else if (teamUser.length === 1) {
        league.teams[tId].discordUser = teamUser[0].id
      } else {
        console.log("found multiple roles for this team, not assigning")
      }
    }
  })
  const content = createTeamsMessage(league.teams)
  if (league.commands.teams.message) {
    const messageId = league.commands.teams.message
    const channelId = league.commands.teams.channel
    try {
      const res = await DiscordRequestProd(
        `channels/${channelId}/messages/${messageId}`,
        {
          method: "PATCH",
          body: {
            content: content,
            allowed_mentions: {
              parse: [],
            },
          },
        }
      )
      const data = await res.json()
      league.commands.teams.message = data.id
    } catch (e) {
      console.log(e)
      console.log(
        "team assigned, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel"
      )
    }
  }
  await setDoc(doc(db, "leagues", guild_id), league, { merge: true })
}
