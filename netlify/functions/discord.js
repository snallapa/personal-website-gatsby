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
import { waitlistHandler } from "../../modules/waitlist.js"
import { teamHandler } from "../../modules/teams.js"
import { streamsHandler } from "../../modules/streams.js"
import { db } from "../../modules/firebase-db.js"

const verifier = VerifyDiscordRequest(process.env.PUBLIC_KEY)

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
      const response = await teamHandler[subcommand](guild_id, command, member)
      return response
    } else if (name === "streams") {
      const command = options[0]
      const subcommand = command.name
      const response = await streamsHandler[subcommand](
        guild_id,
        command,
        member
      )
      return response
    } else if (name === "waitlist") {
      const command = options[0]
      const subcommand = command.name
      const response = await waitlistHandler[subcommand](
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
