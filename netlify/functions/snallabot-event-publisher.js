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
        const res = await DiscordRequest(`guilds/${guild_id}/members?limit=1000`, {
            method: "GET"
        });
        const users = await res.json();
        const userWithRoles = users.map(u => ({ id: u.user.id, roles: u.roles }));
        const backgroundRes = await fetch("https://nallapareddy.com/.netlify/functions/teams-background", {
            method: 'POST',
            body: JSON.stringify({
                guild_id: guild_id,
                users: userWithRoles
            })
        });
        console.log(`guild ${guild_id} team publish successfully`);
        return backgroundRes;
    } catch (e) {
        console.error(`guild ${guild_id} team publish unsuccessful error: ${e}`);
        return { ok: false };
    }
}

async function publishChannelEvent(guild_id) {
    try {
        const res = await DiscordRequest(`guilds/${guild_id}/members?limit=1000`, {
            method: "GET"
        });
        const users = await res.json();
        const userWithRoles = users.map(u => ({ id: u.user.id, roles: u.roles }));
        const channelRes = await DiscordRequest(`guilds/${guild_id}/channels`, {
            method: 'GET',
        });
        const docRef = doc(db, "leagues", guild_id);
        const docSnap = await getDoc(docRef);
        const league = docSnap.data();
        const category = league.commands.game_channels.category;
        const channels = await channelRes.json();
        const channelIds = channels.filter(c => {
            // text channel, in right category, with `vs` in it
            return c.type === 0 && c.parent_id && c.parent_id === category && c.name.includes("vs");
        }).map(c => c.id);
        const backgroundRes = await fetch("https://nallapareddy.com/.netlify/functions/notifier-plane-background", {
            method: 'POST',
            body: JSON.stringify({
                guild_id: guild_id,
                currentChannels: channelIds,
                users: userWithRoles
            })
        });
        console.log(`guild ${guild_id} game channel publish successfully`);
        return backgroundRes;
    } catch (e) {
        console.error(`guild ${guild_id} game channel publish unsuccessful error: ${e}`);
        return { ok: false };
    }
}


exports.handler = async function(event, context) {
    const docRef = doc(db, "leagues", "guild_updates");
    const docSnap = await getDoc(docRef);
    const updateData = docSnap.data();
    const teamGuilds = Object.keys(updateData.teams || {});
    const teamUpdates = teamGuilds.filter(g => updateData.teams[g]).map(g => publishGuildTeamEvent(g));
    const teamUpdatesRes = await Promise.all(teamUpdates);
    if (teamUpdatesRes.every(r => r.ok)) {
        console.log("team updates sent successfully");
    } else {
        console.log("not all team updates were sent succesfully");
    }

    const gameChannelGuilds = Object.keys(updateData.gameChannels || {});
    const gameChannelUpdates = gameChannelGuilds.filter(g => updateData.gameChannels[g]).map(g => publishChannelEvent(g));
    const gameChannelUpdatesRes = await Promise.all(gameChannelUpdates);
    if (gameChannelUpdatesRes.every(r => r.ok)) {
        console.log("game channel updates sent successfully");
    } else {
        console.log("not all game channel updates were sent succesfully");
    }

    return {
        statusCode: 200,
    };
}