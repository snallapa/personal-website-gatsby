import { initializeApp } from "firebase/app"

import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore"
import { DiscordRequestCommunity } from "../../modules/utils.js"
import fetch from "node-fetch"
exports.handler = async function (event, context) {
  // console.log(event)
  const { guild_id } = JSON.parse(event.body)
}
