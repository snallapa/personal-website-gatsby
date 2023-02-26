import { initializeApp } from "firebase/app"

import { getFirestore, doc, getDoc } from "firebase/firestore"

import fetch from "node-fetch"

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

exports.handler = async function(event, context) {
  const docRef = doc(db, "polls", "guild_updates")
  const docSnap = await getDoc(docRef)
  const updateData = docSnap.data()
  const nflGuilds = Object.keys(updateData.nfl.guilds)
  const nbaGuilds = Object.keys(updateData.nba.guilds)
  const nflUpdates = nflGuilds
    .filter(g => updateData.nfl.guilds[g])
    .map(g => {
      return fetch(
        "https://nallapareddy.com/.netlify/functions/community-background",
        {
          method: "POST",
          body: JSON.stringify({
            guild_id: g,
          }),
        }
      )
    })
  const nflUpdatesRes = await Promise.all(nflUpdates)
  const nbaUpdates = nbaGuilds
    .filter(g => updateData.nba.guilds[g])
    .map(g => {
      return fetch(
        "https://nallapareddy.com/.netlify/functions/community-nba-background",
        {
          method: "POST",
          body: JSON.stringify({
            guild_id: g,
          }),
        }
      )
    })
  const nbaUpdatesRes = await Promise.all(nbaUpdates)
  if (nflUpdatesRes.every(r => r.ok) && nbaUpdatesRes.every(r => r.ok)) {
    console.log("updates sent successfully")
  } else {
    console.log("updates were not sent succesfully")
  }
  return {
    statusCode: 200,
  }
}
