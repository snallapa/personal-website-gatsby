import { initializeApp } from "firebase/app";

import { getFirestore , doc, getDoc} from "firebase/firestore";

import fetch from 'node-fetch';

const firebaseConfig = {
    apiKey: "AIzaSyDf9ZiTBWf-sWY007WsKktMPewcrs07CWw",
    authDomain: "championslounge-f0f36.firebaseapp.com",
    projectId: "championslounge-f0f36",
    storageBucket: "championslounge-f0f36.appspot.com",
    messagingSenderId: "163156624093",
    appId: "1:163156624093:web:dfe860c8bb38a62b075134"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);


exports.handler = async function(event, context) {
    const docRef = doc(db, "polls", "guild_updates");
    const docSnap = await getDoc(docRef);
    const updateData = docSnap.data();
    const guilds = Object.keys(updateData.nfl.guilds);
    const updates = guilds.filter(g => updateData.nfl.guilds[g]).map(g => {
        return fetch("https://nallapareddy.com/.netlify/functions/commands-background", {
            method: 'POST',
            body: JSON.stringify({
                guild_id: g
            })
        });
    });
    const updateRes = await Promise.all(updates);
    if (updateRes.every(r => r.ok)) {
        console.log("updates sent successfully");
    } else {
        console.log("updates were not sent succesfully");
    }
}