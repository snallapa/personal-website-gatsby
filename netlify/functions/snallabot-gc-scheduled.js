import { initializeApp } from "firebase/app"

import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore"

import fetch from "node-fetch"
import {DiscordRequest} from "../../modules/utils.js"

const firebaseConfig = {
  apiKey: "AIzaSyDf9ZiTBWf-sWY007WsKktMPewcrs07CWw",
  authDomain: "championslounge-f0f36.firebaseapp.com",
  projectId: "championslounge-f0f36",
  storageBucket: "championslounge-f0f36.appspot.com",
  messagingSenderId: "163156624093",
  appId: "1:163156624093:web:dfe860c8bb38a62b075134",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app)


const reservedLeagues = ["guild_updates", "mca"]

exports.handler = async function(event, context) {
  const res = await DiscordRequest("users/@me/guilds", { method: "GET" })
  const pagedGuilds = await res.json()
  let guilds = pagedGuilds.map(g => g.id)
  let paging = true
  while (paging) {
    const lastGuild = guilds[guilds.length - 1]
    const res = await DiscordRequest(`users/@me/guilds?after=${lastGuild}`, {
      method: "GET",
    })
    const pagedGuilds = await res.json()
    if (pagedGuilds.length === 0) {
      paging = false
    } else {
      guilds = guilds.concat(pagedGuilds.map(g => g.id))
    }
  }
  console.log(`number of servers: ${guilds.length}`)

  const querySnapshot = await getDocs(collection(db, "leagues"))

  console.log(`number of firebase leagues: ${querySnapshot.size}`)

  const deletePromises = querySnapshot.docs.flatMap(fDoc => {
    if (!guilds.includes(fDoc.id) && !reservedLeagues.includes(fDoc.id)) {
      console.log(`deleting league ${fDoc.id}`)
      const update = {}
      update["gameChannels"] = {}
      update["gameChannels"][fDoc.id] = false
      update["teams"] = {}
      update["teams"][fDoc.id] = false
      return [
        deleteDoc(doc(db, "leagues", fDoc.id)),
        setDoc(doc(db, "leagues", "guild_updates"), update, {
          merge: true,
        }),
      ]
    }
    return []
  })

  await Promise.all(deletePromises)

  return {
    statusCode: 200,
  }
}
