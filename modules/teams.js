import { doc, setDoc, updateDoc, deleteField } from "firebase/firestore"
import { respond } from "./utils.js"
import { DiscordRequestProd } from "./utils.js"
import { getLeague, db } from "./firebase-db.js"
import fetch from "node-fetch"

export function findTeam(teams, search_phrase) {
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

export function createTeamsMessage(teams) {
  const k = Object.keys(teams)[0]
  if (teams[k].hasOwnProperty("division")) {
    return formatWithDivision(teams)
  } else {
    return formatNormal(teams)
  }
}

async function handleConfigure(guild_id, command, member) {
  const channel = command.options[0].value
  const autoUpdate = command.options[1] ? command.options[1].value : false
  await setDoc(
    doc(db, "leagues", guild_id),
    {
      commands: {
        teams: {
          channel: channel,
          autoUpdate: autoUpdate,
        },
      },
    },
    { merge: true }
  )
  const update = {}
  update["teams"] = {}
  update["teams"][guild_id] = autoUpdate
  await setDoc(doc(db, "leagues", "guild_updates"), update, {
    merge: true,
  })
  return respond("configured! teams command is ready for use")
}

async function handleAssign(guild_id, command, member) {
  const team = command.options[0].value
  const user = command.options[1].value

  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }

  if (!league.commands.teams || !league.commands.teams.channel) {
    return respond("configure teams first: `/teams configure`")
  }
  const teams = league.teams
  let teamKey
  try {
    teamKey = findTeam(teams, team)
  } catch (e) {
    return respond(
      `could not find the team ${team}! try using abbreviation, full name, or city name`
    )
  }
  league.teams[teamKey].discordUser = user
  let roleMessage = ""
  if (command.options[2]) {
    const roleId = command.options[2].value
    league.teams[teamKey].trackingRole = roleId
    if (!league.commands.teams.autoUpdate) {
      roleMessage =
        "\nRole saved, you can turn on automatic tracking with the /teams configure command"
    }
  }
  try {
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
        league.commands.teams.message = ""
        await setDoc(doc(db, "leagues", guild_id), league, {
          merge: true,
        })
        return respond(
          "team assigned, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel"
        )
      }
    } else {
      const channelId = league.commands.teams.channel
      try {
        const res = await DiscordRequestProd(`channels/${channelId}/messages`, {
          method: "POST",
          body: {
            content: content,
            allowed_mentions: {
              parse: [],
            },
          },
        })
        const data = await res.json()
        league.commands.teams.message = data.id
      } catch (e) {
        console.log(e)
        league.commands.teams.message = ""
        await setDoc(doc(db, "leagues", guild_id), league, {
          merge: true,
        })
        return respond(
          "team assigned, but I couldnt send my message :(. This could mean a permissions issues on the bot or on the channel"
        )
      }
    }
    await setDoc(doc(db, "leagues", guild_id), league, { merge: true })
    return respond("team assigned!" + roleMessage)
  } catch (e) {
    console.log(e)
    return respond("could not assign team :(")
  }
}

async function handleOpen(guild_id, command, member) {
  const team = command.options[0].value
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }

  if (!league.commands.teams || !league.commands.teams.channel) {
    return respond("configure teams first: `/teams configure`")
  }
  const teams = league.teams
  let teamKey
  try {
    teamKey = findTeam(teams, team)
  } catch (e) {
    return respond(
      `could not find the team ${team}! try using abbreviation, full name, or city name`
    )
  }
  league.teams[teamKey].discordUser = ""
  try {
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
        league.commands.teams.message = ""
        await setDoc(doc(db, "leagues", guild_id), league, {
          merge: true,
        })
        return respond(
          "team opened, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel"
        )
      }
    } else {
      try {
        const channelId = league.commands.teams.channel
        const res = await DiscordRequestProd(`channels/${channelId}/messages`, {
          method: "POST",
          body: {
            content: content,
          },
        })
        const data = await res.json()
        league.commands.teams.message = data.id
      } catch (e) {
        console.log(e)
        league.commands.teams.message = ""
        await setDoc(doc(db, "leagues", guild_id), league, {
          merge: true,
        })
        return respond(
          "team opened, but I couldnt send my message :(. This could mean a permissions issues on the bot or on the channel"
        )
      }
    }
    await setDoc(doc(db, "leagues", guild_id), league, { merge: true })
    return respond("team freed!")
  } catch (e) {
    console.log(e)
    return respond("could not free team :(")
  }
}

async function handleReset(guild_id, command, member) {
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }
  const messageId = league.commands.teams.message
  const channelId = league.commands.teams.channel
  const res = await DiscordRequestProd(
    `channels/${channelId}/messages/${messageId}`,
    {
      method: "DELETE",
    }
  )

  await updateDoc(doc(db, "leagues", guild_id), {
    teams: deleteField(),
    ["commands.teams.message"]: deleteField(),
  })

  return respond("team reset")
}

export const teamHandler = {
  configure: handleConfigure,
  assign: handleAssign,
  open: handleOpen,
  reset: handleReset,
}
