import { initializeApp } from "firebase/app"

import { DiscordRequestCommunity } from "../../modules/utils.js"
import { getMediaInteraction } from "../../modules/firebase-db.js"
import fetch from "node-fetch"
exports.handler = async function (event, context) {
  // console.log(event)
  const { guild_id, interaction_id } = JSON.parse(event.body)
  let request
  try {
    request = await getMediaInteraction(interaction_id)
  } catch (e) {
    console.error(e)
  }
  console.log(request)
}
