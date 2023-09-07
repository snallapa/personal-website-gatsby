import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions"
import { doc, getDoc, setDoc } from "firebase/firestore"
import {
  DiscordRequestProd,
  respond,
  VerifyDiscordRequest,
} from "../../modules/utils.js"
import { gameChannelHandler } from "../../modules/game-channels.js"
import { waitlistChannelHandler } from "../../modules/waitlist.js"
import { teamChannelHandler } from "../../modules/teams.js"
import { db } from "../../modules/firebase-db.js"

const verifier = VerifyDiscordRequest(process.env.PUBLIC_KEY)

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

exports.handler = async function (event, context) {
  if (!verifier(event)) {
    return {
      statusCode: 401,
    }
  }
  // console.log(event)
  const { type, guild_id, data, member, name } = JSON.parse(event.body)
  if (type === InteractionType.PING) {
    return {
      statusCode: 200,
      body: JSON.stringify({ type: InteractionResponseType.PONG }),
    }
  }
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data

    if (name === "league_export") {
      return respond(
        `Type this URL carefully into your app (no spaces exactly as shown here): http://snallabot.herokuapp.com/${guild_id}`
      )
    } else if (name === "game_channels") {
      const command = options[0]
      const subcommand = command.name
      const response = await gameChannelHandler[subcommand](
        guild_id,
        command,
        member
      )
      return response
    } else if (name === "teams") {
      const command = options[0]
      const subcommand = command.name
      const response = await teamChannelHandler[subcommand](
        guild_id,
        command,
        member
      )
      return response
    } else if (name === "streams") {
      const command = options[0]
      const subcommand = command.name
      if (subcommand === "configure") {
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
      } else if (subcommand === "count") {
        const user = command.options[0].value
        const docRef = doc(db, "leagues", guild_id)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) {
          return respond(
            `no league found for ${guild_id}, export in MCA using league_export first`
          )
        }
        const league = docSnap.data()
        if (
          !league.commands ||
          !league.commands.streams ||
          !league.commands.streams.channel
        ) {
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
              const res = await DiscordRequestProd(
                `channels/${channelId}/messages`,
                {
                  method: "POST",
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
      } else if (subcommand === "remove") {
        const user = command.options[0].value
        const docRef = doc(db, "leagues", guild_id)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) {
          return respond(
            `no league found for ${guild_id}, export in MCA using league_export first`
          )
        }
        const league = docSnap.data()
        if (
          !league.commands ||
          !league.commands.streams ||
          !league.commands.streams.channel
        ) {
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
              const res = await DiscordRequestProd(
                `channels/${channelId}/messages`,
                {
                  method: "POST",
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
      } else if (subcommand === "reset") {
        const docRef = doc(db, "leagues", guild_id)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) {
          return respond(
            `no league found for ${guild_id}, export in MCA using league_export first`
          )
        }
        const league = docSnap.data()
        if (
          !league.commands ||
          !league.commands.streams ||
          !league.commands.streams.channel
        ) {
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
              const res = await DiscordRequestProd(
                `channels/${channelId}/messages`,
                {
                  method: "POST",
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
    } else if (name === "waitlist") {
      const command = options[0]
      const subcommand = command.name
      const response = await waitlistChannelHandler[subcommand](
        guild_id,
        command,
        member
      )
      return response
    } else if (name === "schedule") {
      const week = options[0].value
      const docRef = doc(db, "leagues", guild_id)
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        return respond(
          `no league found for ${guild_id}, export in MCA using league_export first`
        )
      }
      const league = docSnap.data()
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
      const gamesContent = weeksGames
        .map(
          (game) =>
            `${teams[game.awayTeamId].teamName} vs ${
              teams[game.homeTeamId].teamName
            }`
        )
        .join("\n")
      const scheduleContent = `__**Week ${week}**__\n${gamesContent}`
      return respond(scheduleContent)
    } else if (name === "logger") {
      const command = options[0]
      const subcommand = command.name
      if (subcommand === "configure") {
        const channel = command.options[0].value
        const on = command.options[1] ? command.options[1].value : true

        await setDoc(
          doc(db, "leagues", guild_id),
          {
            commands: {
              logger: {
                channel: channel,
                on: on,
              },
            },
          },
          { merge: true }
        )
        return respond("configured! logger on: " + on)
      }
    } else if (name === "create_game_channels") {
      return respond(
        "this command has been changed. Use `/game_channels create` instead. See https://github.com/snallapa/snallabot for more information"
      )
    } else if (name === "clear_game_channels") {
      return respond(
        "this command has been changed. Use `/game_channels clear` instead. See https://github.com/snallapa/snallabot for more information"
      )
    } else if (name === "test") {
      console.log("test command received!")
      return respond("bot is working!")
    }
  }
  return respond(
    "we should not have gotten here... this command is broken contact owner"
  )
}
