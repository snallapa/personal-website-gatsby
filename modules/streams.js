import { doc, setDoc } from "firebase/firestore"
import { respond } from "./utils.js"
import { DiscordRequestProd } from "./utils.js"
import { getLeague, db } from "./firebase-db.js"
import fetch from "node-fetch"

function createStreamsMessage(counts) {
  const countsList = Object.keys(counts).map((user) => ({
    user: user,
    count: counts[user],
  }))
  const sortedCountsList = countsList.sort((a, b) =>
    a.count > b.count ? -1 : 1
  )
  // sort the countsList
  return (
    "__**Streams**__\n" +
    sortedCountsList
      .map((userCount) => `<@${userCount.user}>: ${userCount.count}`)
      .join("\n")
      .trim()
  )
}

async function handleConfigure(guild_id, command, member) {
  const channel = command.options[0].value
  await setDoc(
    doc(db, "leagues", guild_id),
    {
      commands: {
        streams: {
          channel: channel,
          counts: {},
        },
      },
    },
    { merge: true }
  )
  return respond("configured! streams command is ready for use")
}

async function handleCount(guild_id, command, member) {
  const user = command.options[0].value
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }

  if (!league.commands?.streams?.channel) {
    return respond("streams is not configured yet. Configure it first")
  }
  const currentUserCount = league.commands.streams.counts[user] || 0
  const newCount = command.options[1]
    ? command.options[1].value
    : currentUserCount + 1
  league.commands.streams.counts[user] = newCount
  const content = createStreamsMessage(league.commands.streams.counts)
  try {
    if (league.commands.streams.message) {
      const messageId = league.commands.streams.message
      const channelId = league.commands.streams.channel
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
        league.commands.streams.message = data.id
      } catch (e) {
        console.log(e)
        league.commands.streams.message = ""
        await setDoc(doc(db, "leagues", guild_id), league, {
          merge: true,
        })
        return respond(
          "stream count updated, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel"
        )
      }
    } else {
      const channelId = league.commands.streams.channel
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
        league.commands.streams.message = data.id
      } catch (e) {
        console.log(e)
        league.commands.streams.message = ""
        await setDoc(doc(db, "leagues", guild_id), league, {
          merge: true,
        })
        return respond(
          "stream count updated, but I couldnt send my message :(. This could mean a permissions issues on the bot or on the channel"
        )
      }
    }
    await setDoc(doc(db, "leagues", guild_id), league, { merge: true })
    return respond("stream count updated!")
  } catch (e) {
    console.log(e)
    return respond("could not update stream count :(")
  }
}

async function handleRemove(guild_id, command, member) {
  const user = command.options[0].value
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }

  if (!league.commands?.streams?.channel) {
    return respond("streams is not configured yet. Configure it first")
  }
  delete league.commands.streams.counts[user]
  const content = createStreamsMessage(league.commands.streams.counts)
  try {
    if (league.commands.streams.message) {
      const messageId = league.commands.streams.message
      const channelId = league.commands.streams.channel
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
        league.commands.streams.message = data.id
      } catch (e) {
        console.log(e)
        league.commands.streams.message = ""
        await setDoc(doc(db, "leagues", guild_id), league)
        return respond(
          "user removed from streams, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel"
        )
      }
    } else {
      const channelId = league.commands.streams.channel
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
        league.commands.streams.message = data.id
      } catch (e) {
        console.log(e)
        league.commands.streams.message = ""
        await setDoc(doc(db, "leagues", guild_id), league)
        return respond(
          "user removed from streams, but I couldnt send my message :(. This could mean a permissions issues on the bot or on the channel"
        )
      }
    }
    await setDoc(doc(db, "leagues", guild_id), league)
    return respond("user removed from streams!")
  } catch (e) {
    console.log(e)
    return respond("could not remove user from streams :(")
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

  if (!league.commands?.streams?.channel) {
    return respond("streams is not configured yet. Configure it first")
  }
  Object.keys(league.commands.streams.counts).forEach((user) => {
    league.commands.streams.counts[user] = 0
  })
  const content = createStreamsMessage(league.commands.streams.counts)
  try {
    if (league.commands.streams.message) {
      const messageId = league.commands.streams.message
      const channelId = league.commands.streams.channel
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
        league.commands.streams.message = data.id
      } catch (e) {
        console.log(e)
        league.commands.streams.message = ""
        await setDoc(doc(db, "leagues", guild_id), league, {
          merge: true,
        })
        return respond(
          "streams reset, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel"
        )
      }
    } else {
      const channelId = league.commands.streams.channel
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
        league.commands.streams.message = data.id
      } catch (e) {
        console.log(e)
        league.commands.streams.message = ""
        await setDoc(doc(db, "leagues", guild_id), league, {
          merge: true,
        })
        return respond(
          "streams reset, but I couldnt send my message :(. This could mean a permissions issues on the bot or on the channel"
        )
      }
    }
    await setDoc(doc(db, "leagues", guild_id), league, { merge: true })
    return respond("streams reset!")
  } catch (e) {
    console.log(e)
    return respond("could not reset streams :(")
  }
}

export const streamsHandler = {
  configure: handleConfigure,
  count: handleCount,
  remove: handleRemove,
  reset: handleReset,
}
