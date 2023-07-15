import { doc, setDoc } from "firebase/firestore"
import { respond } from "./utils.js"
import { DiscordRequestProd } from "./utils.js"
import { getLeague, db } from "./firebase-db.js"
import fetch from "node-fetch"

async function handleConfigure(guild_id, command, member) {
  const category = command.options[0].value
  await setDoc(
    doc(db, "leagues", guild_id),
    {
      commands: {
        game_channels: {
          category: category,
        },
      },
    },
    { merge: true }
  )
  return respond("configured! game channels command is ready for use")
}

async function handleCreate(guild_id, command, member) {
  const week = command.options[0].value
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }
  let category
  try {
    category = league.commands.game_channels.category
  } catch (error) {
    return respond(
      "missing configuration, run `/game_channels configure` first"
    )
  }
  if (!league.schedules.reg || !league.schedules.reg[`week${week}`]) {
    return respond(
      `missing week ${week}. Please export the week in MCA (select ALL WEEKS in the app!)`
    )
  }

  if (week > 18) {
    return respond(`sorry I dont know about playoffs :(`)
  }

  const weeksGames = league.schedules.reg[`week${week}`]
  const teams = league.teams
  const channelPromises = weeksGames.map((game) => {
    return DiscordRequestProd(`guilds/${guild_id}/channels`, {
      method: "POST",
      body: {
        type: 0,
        name: `${teams[game.awayTeamId].teamName}-vs-${
          teams[game.homeTeamId].teamName
        }`,
        parent_id: category,
      },
    })
  })
  const responses = await Promise.all(channelPromises)
  const logger = league.commands.logger || {}
  if (logger.on) {
    const _ = await fetch(
      "https://nallapareddy.com/.netlify/functions/snallabot-logger-background",
      {
        method: "POST",
        body: JSON.stringify({
          guild_id: guild_id,
          logType: "COMMAND",
          user: member.user.id,
          command: `game channels ${subcommand}`,
        }),
      }
    )
  }
  if (responses.every((r) => r.ok)) {
    return respond("created!")
  } else {
    return respond("something went wrong... maybe try again or contact owner")
  }
}

async function handleClear(guild_id, command, member) {
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }
  let category
  try {
    category = league.commands.game_channels.category
  } catch (error) {
    return respond(
      "missing configuration, run `/game_channels configure` first"
    )
  }
  const res = await DiscordRequestProd(`guilds/${guild_id}/channels`, {
    method: "GET",
  })
  const channels = await res.json()
  const gameChannels = channels.filter((c) => {
    // text channel, in right category, with `vs` in it
    return (
      c.type === 0 &&
      c.parent_id &&
      c.parent_id === category &&
      c.name.includes("vs")
    )
  })
  const gameChannelIds = gameChannels.map((c) => c.id)
  const logger = league.commands.logger || {}
  let responses
  if (logger.on) {
    const logPromises = gameChannels.map((c) =>
      fetch(
        "https://nallapareddy.com/.netlify/functions/snallabot-logger-background",
        {
          method: "POST",
          body: JSON.stringify({
            guild_id: guild_id,
            logType: "CHANNEL",
            channelId: c.id,
            additionalMessages: [
              {
                content: `game channels ${subcommand}`,
                user: member.user.id,
              },
            ],
          }),
        }
      )
    )
    responses = await Promise.all(logPromises)
  } else {
    const deletePromises = gameChannelIds.map((id) =>
      DiscordRequestProd(`/channels/${id}`, { method: "DELETE" })
    )
    responses = await Promise.all(deletePromises)
  }
  if (responses.every((r) => r.ok)) {
    return respond("done, all game channels were deleted!")
  } else {
    return respond("hmm something went wrong :(, not all of them were deleted")
  }
}

function notifierMessage(users) {
  return `${users}\nTime to schedule your game! Once your game is scheduled, hit the ⏰. Otherwise, You will be notified again.\nWhen you're done playing, let me know with 🏆.\nNeed to sim this game? React with ⏭ AND the home/away to force win. Choose both home and away to fair sim!`
}

async function handleNotify(guild_id, command, member) {
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }
  let category
  try {
    category = league.commands.game_channels.category
  } catch (error) {
    return respond(
      "missing configuration, run `/game_channels configure` first"
    )
  }
  const res = await DiscordRequestProd(`guilds/${guild_id}/channels`, {
    method: "GET",
  })
  const channels = await res.json()
  const messagePromises = channels
    .filter((c) => {
      // filter on optional parameter
      if (command.options && command.options[0]) {
        const channelId = command.options[0].value
        return c.id === channelId
      }
      // text channel, in right category, with `vs` in it
      return (
        c.type === 0 &&
        c.parent_id &&
        c.parent_id === category &&
        c.name.includes("vs")
      )
    })
    .flatMap((c) => {
      console.log(c.name)
      const channelId = c.id
      const channelTeams = c.name.split("-vs-").map((t) => t.replace("-", " "))
      const content = channelTeams
        .map((t) => {
          const user = league.teams[findTeam(league.teams, t)].discordUser
          if (user) {
            return `<@${user}>`
          } else {
            return ""
          }
        })
        .join(" at ")
        .trim()
      // console.log(content);
      if (content) {
        const message = league.commands.game_channels.autoUpdate
          ? notifierMessage(content)
          : content
        return [
          DiscordRequestProd(`channels/${channelId}/messages`, {
            method: "POST",
            body: {
              content: message,
            },
          }),
        ]
      } else {
        return []
      }
    })
  const responses = await Promise.all(messagePromises)
  if (responses.every((r) => r.ok)) {
    const messages = await Promise.all(responses.map((r) => r.json()))
    const currentTime = new Date().getTime()
    league.commands.game_channels.channels =
      league.commands.game_channels.channels || {}
    league.commands.game_channels.channels = messages.reduce((acc, m) => {
      if (acc[m.channel_id]) {
        acc[m.channel_id].lastNotified = currentTime
      } else {
        acc[m.channel_id] = { message: m.id, lastNotified: currentTime }
      }
      return acc
    }, league.commands.game_channels.channels)
    await setDoc(doc(db, "leagues", guild_id), league, { merge: true })
    return respond("all users notified!")
  } else {
    return respond("hmm something went wrong :(, not all of them were notified")
  }
}

async function handleConfigureNotifier(guild_id, command, member) {
  const fwChannel = command.options[0].value
  const waitPing = command.options[1].value
  const adminRole = command.options[2] ? command.options[2].value : ""
  await setDoc(
    doc(db, "leagues", guild_id),
    {
      commands: {
        game_channels: {
          fwChannel,
          waitPing,
          adminRole,
          autoUpdate: true,
        },
      },
    },
    { merge: true }
  )
  const update = {}
  update["gameChannels"] = {}
  update["gameChannels"][guild_id] = true
  await setDoc(doc(db, "leagues", "guild_updates"), update, {
    merge: true,
  })
  return respond("configured! notifier is ready for use")
}

async function handleOffNotifier(guild_id, command, member) {
  await setDoc(
    doc(db, "leagues", guild_id),
    {
      commands: {
        game_channels: {
          autoUpdate: false,
        },
      },
    },
    { merge: true }
  )
  const update = {}
  update["gameChannels"] = {}
  update["gameChannels"][guild_id] = false
  await setDoc(doc(db, "leagues", "guild_updates"), update, {
    merge: true,
  })
  return respond("notifier is turned off")
}

export const gameChannelHandler = {
  configure: handleConfigure,
  create: handleCreate,
  notify: handleNotify,
  configure_notifier: handleConfigureNotifier,
  off_notifier: handleOffNotifier,
  clear: handleClear,
}
