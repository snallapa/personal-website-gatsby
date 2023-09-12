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
import fetch from "node-fetch"

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

function findTeam(teams, search_phrase) {
  const term = search_phrase.toLowerCase()
  for (let key in teams) {
    const currentTeam = teams[key]
    if (
      currentTeam.abbr.toLowerCase() === term ||
      currentTeam.cityName.toLowerCase() === term ||
      currentTeam.teamName.toLowerCase() === term
    ) {
      return key
    }
  }
  throw `could not find team ${search_phrase}`
}

const reactions = {
  sch: "%E2%8F%B0",
  gg: "%F0%9F%8F%86",
  home: "%F0%9F%8F%A0",
  away: "%F0%9F%9B%AB",
  fw: "%E2%8F%AD%EF%B8%8F",
}

async function react(channelId, messageId) {
  try {
    const reactionPromise = Object.keys(reactions).reduce((p, reaction) => {
      const currentReaction = reactions[reaction]
      return p.then((_) =>
        DiscordRequestProd(
          `channels/${channelId}/messages/${messageId}/reactions/${currentReaction}/@me`,
          { method: "PUT" }
        )
      )
    }, Promise.resolve())
    await reactionPromise
  } catch (e) {
    console.error(`reaction failed for ${channelId} and ${messageId}`)
    throw e
  }
}

async function getReactedUsers(channelId, messageId, reaction) {
  try {
    return DiscordRequestProd(
      `channels/${channelId}/messages/${messageId}/reactions/${reactions[reaction]}`,
      { method: "GET" }
    ).then((r) => r.json())
  } catch (e) {
    console.error(
      `get reaction failed for ${channelId}, ${messageId}, and ${reaction}`
    )
    throw e
  }
}

function decideResult(homeUsers, awayUsers) {
  if (homeUsers.length > 1 && awayUsers.length > 1) {
    return "Fair Sim"
  }
  if (homeUsers.length > 1) {
    return "FW Home"
  }
  if (awayUsers.length > 1) {
    return "FW Away"
  }
  throw Error("we should not have gotten here!")
}

function joinUsers(users) {
  return users.map((uId) => `<@${uId}>`).join("")
}

async function forceWin(
  fwChannel,
  gameChannel,
  result,
  requestedUsers,
  confirmedUsers,
  logger,
  guild_id
) {
  const res = await DiscordRequestProd(`channels/${gameChannel}`, {
    method: "GET",
  })
  const channel = await res.json()
  const channelName = channel.name
  const requestMessage =
    requestedUsers.length > 0 ? "requested: " + joinUsers(requestedUsers) : ""
  const confirmedUsersMessage =
    confirmedUsers.length > 0 ? "confirmed: " + joinUsers(confirmedUsers) : ""
  const message = `${channelName}: ${result}, ${requestMessage} ${confirmedUsersMessage}`
  await DiscordRequestProd(`channels/${fwChannel}/messages`, {
    method: "POST",
    body: {
      content: message,
      allowed_mentions: {
        parse: [],
      },
    },
  })
  if (logger.on) {
    const _ = await fetch(
      "https://nallapareddy.com/.netlify/functions/snallabot-logger-background",
      {
        method: "POST",
        body: JSON.stringify({
          guild_id: guild_id,
          logType: "CHANNEL",
          channelId: gameChannel,
          additionalMessages: [
            {
              content: `cleared by ${joinUsers(
                requestedUsers.concat(confirmedUsers)
              )}`,
              user: SNALLABOT_USER,
            },
          ],
        }),
      }
    )
  } else {
    await DiscordRequestProd(`channels/${gameChannel}`, { method: "DELETE" })
  }
  return true
}

async function ping(gameChannel, teams) {
  const res = await DiscordRequestProd(`channels/${gameChannel}`, {
    method: "GET",
  })
  const channel = await res.json()
  const channelName = channel.name
  const channelTeams = channelName.split("-vs-").map((t) => t.replace("-", " "))
  const content = channelTeams
    .map((t) => {
      const user = teams[findTeam(teams, t)].discordUser
      if (user) {
        return `<@${user}>`
      } else {
        return ""
      }
    })
    .join(" ")
    .trim()
  await DiscordRequestProd(`channels/${gameChannel}/messages`, {
    method: "POST",
    body: {
      content: `${content} is your game scheduled? Schedule it! or react to my first message to set it as scheduled! Hit the trophy if its done already`,
    },
  })
  return true
}

async function updateChannel(cId, league, users, guild_id) {
  const channelStates = league.commands.game_channels.channels || {}
  const currentState = channelStates[cId]
  const logger = league.commands.logger || {}
  try {
    if (!currentState) {
      return {}
    }
    currentState.events = currentState.events || []
    if (currentState.events.includes("DONE")) {
      return currentState
    }
    // first if we havent reacted, we must react
    if (!currentState.events.includes("REACTED")) {
      try {
        currentState.events.push("REACTED")
        await react(cId, currentState.message)
        return currentState
      } catch (e) {
        console.error(`guild ${guild_id} failed to react error: ${e}`)
        return currentState
      }
    } else {
      const ggUsers = await getReactedUsers(cId, currentState.message, "gg")
      const scheduledUsers = await getReactedUsers(
        cId,
        currentState.message,
        "sch"
      )
      const homeUsers = await getReactedUsers(cId, currentState.message, "home")
      const awayUsers = await getReactedUsers(cId, currentState.message, "away")
      const fwUsers = await getReactedUsers(cId, currentState.message, "fw")
      if (ggUsers.length > 1) {
        currentState.events.push("DONE")
        if (logger.on) {
          const filteredGGUsers = ggUsers
            .map((u) => u.id)
            .filter((uId) => uId !== SNALLABOT_USER)
          const _ = await fetch(
            "https://nallapareddy.com/.netlify/functions/snallabot-logger-background",
            {
              method: "POST",
              body: JSON.stringify({
                guild_id: guild_id,
                logType: "CHANNEL",
                channelId: cId,
                additionalMessages: [
                  {
                    content: `cleared by ${joinUsers(filteredGGUsers)}`,
                    user: SNALLABOT_USER,
                  },
                ],
              }),
            }
          )
        } else {
          await DiscordRequestProd(`channels/${cId}`, { method: "DELETE" })
        }
        return currentState
      }
      if (fwUsers.length > 1) {
        const requestedUsers = fwUsers
          .map((u) => u.id)
          .filter((uId) => SNALLABOT_USER !== uId)
        if (league.commands.game_channels.adminRole) {
          const admins = users
            .filter((u) =>
              u.roles.includes(league.commands.game_channels.adminRole)
            )
            .map((u) => u.id)
          const confirmed = requestedUsers.filter((uId) => admins.includes(uId))
          if (confirmed.length >= 1) {
            try {
              const result = decideResult(homeUsers, awayUsers)
              const req = requestedUsers.filter((uId) => !admins.includes(uId))
              await forceWin(
                league.commands.game_channels.fwChannel,
                cId,
                result,
                req,
                confirmed,
                logger,
                guild_id
              )
              currentState.events.push("DONE")
              return currentState
            } catch (e) {
              console.warn(
                `FW requested but no home or away option chosen. Doing nothing ${guild_id}, ${cId}: ${e}`
              )
              return currentState
            }
          } else if (!currentState.events.includes("FW_REQUESTED")) {
            const message = `FW requested <@&${
              league.commands.game_channels.adminRole
            }> by ${joinUsers(requestedUsers)}`
            await DiscordRequestProd(`channels/${cId}/messages`, {
              method: "POST",
              body: {
                content: message,
                allowed_mentions: {
                  parse: ["roles"],
                },
              },
            })
            currentState.events.push("FW_REQUESTED")
            return currentState
          }
        } else {
          try {
            const result = decideResult(homeUsers, awayUsers)
            await forceWin(
              league.commands.game_channels.fwChannel,
              cId,
              result,
              requestedUsers,
              [],
              logger,
              guild_id
            )
            currentState.events.push("DONE")
            return currentState
          } catch (e) {
            console.warn(
              `FW requested but no home or away option chosen. Doing nothing ${guild_id}, ${cId}: ${e}`
            )
            return currentState
          }
        }
      }

      if (scheduledUsers.length === 1) {
        const waitPing = league.commands.game_channels.waitPing || 12
        const now = new Date()
        const last = new Date(currentState.lastNotified)
        const hoursSince = (now - last) / 36e5
        if (hoursSince > waitPing) {
          currentState.lastNotified = new Date().getTime()
          await ping(cId, league.teams)
          return currentState
        }
      }
    }
  } catch (e) {
    console.log(`${guild_id} ${cId} failed to update`)
    console.error(e)
    return currentState
  }
}

exports.handler = async function (event, context) {
  const { guild_id, currentChannels, users } = JSON.parse(event.body)
  console.log(currentChannels)

  const docRef = doc(db, "leagues", guild_id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    console.log(`no league found for ${guild_id}`)
    return
  }
  let league = docSnap.data()

  // delete channels not there
  const channelStates = league.commands.game_channels.channels || {}
  const deletions = Object.keys(channelStates)
    .filter((cId) => !currentChannels.includes(cId))
    .reduce((acc, cId) => {
      acc[`commands.game_channels.channels.${cId}`] = deleteField()
      return acc
    }, {})
  await updateDoc(docRef, deletions)

  const updatedSnap = await getDoc(docRef)
  league = updatedSnap.data()

  const promises = currentChannels.map((cId) =>
    updateChannel(cId, league, users, guild_id)
  )
  const res = await Promise.all(promises)
  await setDoc(doc(db, "leagues", guild_id), league, { merge: true })
}
