import fetch from 'node-fetch';
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";


const firebaseConfig = {
    apiKey: "AIzaSyDf9ZiTBWf-sWY007WsKktMPewcrs07CWw",
    authDomain: "championslounge-f0f36.firebaseapp.com",
    projectId: "championslounge-f0f36",
    storageBucket: "championslounge-f0f36.appspot.com",
    messagingSenderId: "163156624093",
    appId: "1:163156624093:web:dfe860c8bb38a62b075134"
};

const app = initializeApp(firebaseConfig);


// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

function findTeam(teams, search_phrase) {
    const term = search_phrase.toLowerCase();
    for (let key in teams) {
        const currentTeam = teams[key];
        if (currentTeam.abbr.toLowerCase() === term || currentTeam.cityName.toLowerCase() === term || currentTeam.teamName.toLowerCase() === term) {
            return key;
        }
    }
    throw `could not find team ${search_phrase}`;
}

async function DiscordRequest(endpoint, options, retries = 3) {
    // append endpoint to root API URL
    const url = 'https://discord.com/api/v9/' + endpoint;
    // Stringify payloads
    if (options.body) options.body = JSON.stringify(options.body);
    // Use node-fetch to make requests
    let retryCounter = 0;
    while (retryCounter <= retries) {
        const res = await fetch(url, {
            headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json; charset=UTF-8',
            },
            ...options
        });
    
        // throw API errors
        if (!res.ok) {
            const data = await res.json();
            console.log("Discord Request Failed: " + data);
            if (data["retry_after"]) {
                await new Promise(r => setTimeout(r, error["retry_after"] * 1000));
            }
            retryCounter = retryCounter + 1;
            continue;
        }
        return res;
    }
    throw new Error("number of retries exceeded");
}

const reactions = {
    "gg": "U%2B1F3C6",
    "home": "U%2B1F3C6",
    "away": "U%2B1F6EB",
    "fw": "U%2B23ED"
}

exports.handler = async function (event, context) {
    const { guild_id } = JSON.parse(event.body);

    const docRef = doc(db, "leagues", guild_id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        console.log(`no league found for ${guild_id}`)
        return;
    }
    const league = docSnap.data();
    let category;
    try {
        category = league.commands.game_channels.category
    } catch (error) {
        console.log(`missing configuration`)
        return;
    }
    const res = await DiscordRequest(`guilds/${guild_id}/channels`, {
        method: 'GET',
    });
    const channels = await res.json();
    const gameChannels = channels.filter(c => {
        // text channel, in right category, with `vs` in it
        return c.type === 0 && c.parent_id && c.parent_id === category && c.name.includes("vs");
    });
    const notifiedChannels = league.commands.game_channels;
    // first notification
    if (!notifiedChannels.channels) {
        const messagePromises = gameChannels.flatMap(c => {
            const channelTeams = c.name.split("-vs-").map(t => t.replace("-", " "));
            const content = channelTeams.map(t => {
                const user = league.teams[findTeam(league.teams, t)].discordUser;
                if (user) {
                    return `<@${user}>`;
                } else {
                    return "";
                }
            }).join(" ").trim();
            // console.log(content);
            if (content) {
                return [DiscordRequest(`channels/${channelId}/messages`, {
                    method: 'POST',
                    body: {
                        content: content,
                    }
                }).then((res) => res.json()).then(message => {
                    notifiedChannels.channels[message.channelId] = { messageId: message.id };
                    notifiedChannels.channels[message.channelId].lastNotified = Date.now();
                })];
            } else {
                return [];
            }
        });
        const responses = await Promise.all(messagePromises);
        if (responses.every(r => r.ok)) {
            console.log("all were users notified!");
        } else {
            console.log("hmm something went wrong :(, not all of them were notified " + responses.filter(r => !r.ok));
        }
        await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
        console.log("notify messages saved");
        return;
    }
    const channelInfos = gameChannels.map(c => ({ id: c.id, info: notifiedChannels.channels[c.id] }));
    channelInfos.map(channel => {
        return DiscordRequest(`/channels/${channel.id}/messages/${channel.info.messageId}/reactions/${reactions[gg]}`).then()
    })
}