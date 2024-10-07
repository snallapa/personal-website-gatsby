import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore"

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
export const db = getFirestore(app)

export async function getLeague(guild_id) {
  const docRef = doc(db, "leagues", guild_id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    throw new Error(
      `no league found for ${guild_id}, export in MCA using league_export first`
    )
  }
  return docSnap.data()
}

export async function getMedia(guild_id) {
  const docRef = doc(db, "media", guild_id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    throw new Error(
      `no league found for ${guild_id}, export in MCA using media_export first`
    )
  }
  return docSnap.data()
}

export async function getMediaInteraction(interaction_id) {
  const docRef = doc(db, "media_interactions", interaction_id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    throw new Error(`no interaction found for this media, redo the command`)
  }
  return docSnap.data()
}

export async function deleteMediaInteraction(interaction_id) {
  const docRef = doc(db, "media_interactions", interaction_id)
  const docSnap = await deleteDoc(docRef)
}

export async function getMediaWeek(guild_id, weekNum) {
  const docRef = doc(db, "media", guild_id, "reg", `week${weekNum}`)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    throw new Error(
      `no week found for ${guild_id} and ${weekNum}, export in MCA using media_export first`
    )
  }
  return docSnap.data()
}

export async function getAllDashboardLeagues() {
    const leagueRef = collection(db, "leagues")
    const q = query(leagueRef, orderBy("madden_server.leagueId"))
    const snapshot = await getDocs(q)
    const leagues = []
    snapshot.forEach(doc => {
	leagues.push(doc)
    })
    return leagues
}
