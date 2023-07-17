import { InteractionType, InteractionResponseType } from "discord-interactions"
import { doc, getDoc, setDoc } from "firebase/firestore"
import {
  DiscordRequestProd,
  respond,
  VerifyDiscordRequest,
} from "../../modules/utils.js"
import { db } from "../../modules/firebase-db.js"

const verifier = VerifyDiscordRequest(process.env.PUBLIC_KEY_MEDIA)

exports.handler = async function (event, context) {
  if (!verifier(event)) {
    return {
      statusCode: 401,
    }
  }
  console.log(event)
  const { type, guild_id, data, member, name } = JSON.parse(event.body)
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
        `Type this URL carefully into your app (no spaces exactly as shown here): http://snallabot.herokuapp.com/${guild_id}\n\n Choose: League Info, Rosters, Weekly Stats. Scroll to all Weeks`
      )
    } else if (name === "test_media") {
      return respond("bot is working! :)")
    }
  }
}
