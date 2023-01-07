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

async function DiscordRequest(endpoint, options) {
    // append endpoint to root API URL
    const url = 'https://discord.com/api/v9/' + endpoint;
    // Stringify payloads
    if (options.body) options.body = JSON.stringify(options.body);
    // Use node-fetch to make requests
    let tries = 0;
    const maxTries = 5;
    while (tries < maxTries) {
        const res = await fetch(url, {
            headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json; charset=UTF-8',
            },
            ...options
        });
        if (!res.ok) {
            const data = await res.json();
            if (data["retry_after"]) {
                tries = tries + 1;
                await new Promise(r => setTimeout(r, error["retry_after"] * 1000));
            } else {
                console.log(res);
                throw new Error(JSON.stringify(data));
            }
        } else {
            return res;
        }
    }
}

async function publishGuildTeamEvent(guild_id) {
    try {
        const res = await DiscordRequest(`guilds/${g}/members?limit=1000`, {
            method: "GET"
        });
        const users = await res.json();
        const userWithRoles = users.map(u => ({ id: u.user.id, roles: u.roles }));
        const _ = await fetch("https://nallapareddy.com/.netlify/functions/teams-background", {
            method: 'POST',
            body: JSON.stringify({
                guild_id: guild_id,
                users: userWithRoles
            })
        });
        console.log(`guild ${guild_id} team publish successfully`);
    } catch (e) {
        console.error(`guild ${guild_id} team publish unsuccessful error: ${e}`);
    }
}

exports.handler = async function(event, context) {
    const docRef = doc(db, "leagues", "guild_updates");
    const docSnap = await getDoc(docRef);
    const updateData = docSnap.data();
    const guilds = Object.keys(updateData.teams);
    const updates = guilds.filter(g => updateData.teams[g]).map(g => publishGuildTeamEvent(g));
    const updateRes = await Promise.all(updates);
    if (updateRes.every(r => r.ok)) {
        console.log("updates sent successfully");
    } else {
        console.log("updates were not sent succesfully");
    }
    return {
        statusCode: 200,
    };
}