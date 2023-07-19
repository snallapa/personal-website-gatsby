import { InteractionType, InteractionResponseType } from "discord-interactions"
import { doc, getDoc, setDoc } from "firebase/firestore"
import {
  DiscordRequestProd,
  respond,
  ackMessage,
  updateMessage,
  VerifyDiscordRequest,
  hoursSince,
} from "../../modules/utils.js"
import {
  db,
  getMedia,
  deleteMediaInteraction,
} from "../../modules/firebase-db.js"

const verifier = VerifyDiscordRequest(process.env.PUBLIC_KEY_MEDIA)

exports.handler = async function (event, context) {
  if (!verifier(event)) {
    return {
      statusCode: 401,
    }
  }
  const discordEvent = JSON.parse(event.body)
  const { type, guild_id, data, member, name } = discordEvent
  if (type === InteractionType.PING) {
    return {
      statusCode: 200,
      body: JSON.stringify({ type: InteractionResponseType.PONG }),
    }
  }
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data

    if (name === "media_export") {
      return respond(
        `Type this URL carefully into your app (no spaces exactly as shown here): http://snallabot.herokuapp.com/media/${guild_id}\n\n Choose: League Info, Rosters, Weekly Stats. Scroll to ALL WEEKS`
      )
    } else if (name === "test_media") {
      return respond("bot is working! :)")
    } else if (name === "setup_media") {
      const channel = options[0].value
      await setDoc(
        doc(db, "media", guild_id),
        {
          commands: {
            media: {
              channel: channel,
            },
          },
        },
        { merge: true }
      )
      return respond("configured! generate media command is ready for use")
    } else if (name === "generate_media") {
      let league
      try {
        league = await getMedia(guild_id)
      } catch (e) {
        return respond(e.message)
      }
      try {
        const category = league.commands.media.category
      } catch (e) {
        return respond("run /setup_media first to set category")
      }
      const lastGeneratedTime = league.commands?.media?.lastGeneratedTime

      if (lastGeneratedTime) {
        const hours = hoursSince(lastGeneratedTime)
        const limit = Number(process.env.MEDIA_LIMIT) || 1
        if (hours <= limit) {
          return respond(
            `due to ChatGPT limits, I can only run this command once every ${limit} hour(s)`
          )
        }
      }
      const week = options[0].value
      if (!league.stats?.reg?.[`week${week}`]) {
        return respond(
          `missing week ${week}. Please export the week in MCA (select ALL WEEKS in the app!)`
        )
      }
      const weeksGames = league.schedules.reg[`week${week}`]
      const teams = league.teams
      await setDoc(
        doc(db, "media", guild_id),
        {
          commands: {
            media: {
              lastGeneratedTime: new Date().getTime(),
            },
          },
        },
        { merge: true }
      )
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Customize your media generation for week ${week}`,
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 3,
                    custom_id: "choose_game",
                    options: weeksGames.map((game) => {
                      const gameName = `${teams[game.awayTeamId].teamName} ${
                        game.awayScore
                      } vs ${game.homeScore} ${teams[game.homeTeamId].teamName}`
                      return {
                        label: gameName,
                        value: game.scheduleId,
                        description: "",
                      }
                    }),
                    placeholder: "Choose the game you want to generate media",
                  },
                ],
              },
              {
                type: 1,
                components: [
                  {
                    type: 3,
                    custom_id: "choose_media",
                    options: [
                      {
                        label: "First Take with Stephen A Smith",
                        value: "first_take",
                        description:
                          "Generates a sports article in Stephen A Smith voice",
                      },
                      {
                        label: "FS1 with Skip and Shannon",
                        value: "fs",
                        description:
                          "Generates a sports article between Skip and Shannon from FS1",
                      },
                    ],
                    placeholder: "Choose the media you want to generate",
                  },
                ],
              },
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    label: "Generate",
                    style: 1,
                    custom_id: "generate_media",
                  },
                  {
                    type: 2,
                    label: "Cancel",
                    style: 2,
                    custom_id: "cancel_media",
                  },
                ],
              },
            ],
          },
        }),
      }
    }
  } else if (type === InteractionType.MESSAGE_COMPONENT) {
    const { custom_id, values } = data
    const {
      message: {
        id: messageId,
        interaction: { id: interactionId },
      },
    } = discordEvent
    if (custom_id === "choose_game") {
      const scheduleId = values[0]
      await setDoc(
        doc(db, "media_interactions", interactionId),
        {
          scheduleId,
        },
        { merge: true }
      )
      return ackMessage()
    } else if (custom_id === "choose_media") {
      const mediaId = values[0]
      await setDoc(
        doc(db, "media_interactions", interactionId),
        {
          mediaId,
        },
        { merge: true }
      )
      return ackMessage()
    } else if (custom_id === "generate_media") {
      const _ = await fetch(
        "https://nallapareddy.com/.netlify/functions/media-poster-background",
        {
          method: "POST",
          body: JSON.stringify({
            guild_id: guild_id,
            interaction_id: interactionId,
            message_id: messageId,
          }),
        }
      )
      return updateMessage("generating media... might take a moment")
    } else if (custom_id === "cancel_media") {
      await deleteMediaInteraction(interactionId)
      return updateMessage("canceled :)")
    }
    return respond(
      "we should not have gotten here... this command is broken contact owner"
    )
  }
}
