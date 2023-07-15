import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { doc, getDoc } from "firebase/firestore"

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
