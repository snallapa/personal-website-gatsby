import { doc, setDoc } from "firebase/firestore"
import { respond } from "./utils.js"
import { DiscordRequestProd } from "./utils.js"
import { getLeague, db } from "./firebase-db.js"
import { findTeam } from "./teams.js"
import { InteractionResponseType } from "discord-interactions"
import fetch from "node-fetch"

async function handleConfigure(guild_id, command, member, token) {
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

async function handleCreate(guild_id, command, member, token) {
  await fetch(
    "https://nallapareddy.com/.netlify/functions/game-channel-handler-background.js",
    {
      method: "POST",
      body: JSON.stringify({
        guild_id: guild_id,
        command: command,
        member: member,
        token: token,
        commandType: "CREATE",
      }),
    }
  )

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: {},
    }),
  }
}

async function handleCreateWildcard(guild_id, command, member, token) {
  command.options = []
  command.options[0] = { value: 19 }
  return handleCreate(guild_id, command, member)
}

async function handleCreateDivisional(guild_id, command, member, token) {
  command.options = []
  command.options[0] = { value: 20 }
  return handleCreate(guild_id, command, member)
}

async function handleCreateConferenceChampionships(
  guild_id,
  command,
  member,
  token
) {
  command.options = []
  command.options[0] = { value: 21 }
  return handleCreate(guild_id, command, member)
}

async function handleCreateSuperBowl(guild_id, command, member, token) {
  command.options = []
  command.options[0] = { value: 23 }
  return handleCreate(guild_id, command, member)
}

async function handleClear(guild_id, command, member, token) {
  await fetch(
    "https://nallapareddy.com/.netlify/functions/game-channel-handler-background.js",
    {
      method: "POST",
      body: JSON.stringify({
        guild_id: guild_id,
        command: command,
        member: member,
        token: token,
        commandType: "CLEAR",
      }),
    }
  )

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: {},
    }),
  }
}

function notifierMessage(users) {
  return `${users}\nTime to schedule your game! Once your game is scheduled, hit the ⏰. Otherwise, You will be notified again.\nWhen you're done playing, let me know with 🏆.\nNeed to sim this game? React with ⏭ AND the home/away to force win. Choose both home and away to fair sim!`
}

async function handleNotify(guild_id, command, member, token) {
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

async function handleConfigureNotifier(guild_id, command, member, token) {
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

async function handleOffNotifier(guild_id, command, member, token) {
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
  create_wildcard: handleCreateWildcard,
  create_divisional: handleCreateDivisional,
  create_conference: handleCreateConferenceChampionships,
  create_superbowl: handleCreateSuperBowl,
}
