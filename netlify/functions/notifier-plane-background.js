import fetch from 'node-fetch';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField } from "firebase/firestore";


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

const reactions = {
    "sch": "U%2B23F0",
    "gg": "U%2B1F3C6",
    "home": "U%2B1F3C6",
    "away": "U%2B1F6EB",
    "fw": "U%2B23ED"
}

async function react(channelId, messageId) {
    try {
        const reactionPromises = Object.keys(reactions).map(reaction => {
            const currentReaction = reactions[reaction];
            return DiscordRequest(`/channels/${channel.id}/messages/${channel.info.messageId}/reactions/${currentReaction}/@me`, {method: 'PUT'})
        })
        await Promise.all(reactionPromises)
    } catch (e) {
        console.error(`reaction failed for ${channelId} and ${messageId}`);
        throw e;
    }
}

async function getReactedUsers(channelId, messageId, reaction) {
    try {
        return DiscordRequest(`/channels/${channel.id}/messages/${channel.info.messageId}/reactions/${reactions[reaction]}`, { method: 'GET' })
            .then(r => r.json());
    } catch (e) {
        console.error(`get reaction failed for ${channelId}, ${messageId}, and ${reaction}`);
        throw e;
    }
}

function decideResult(homeUsers, awayUsers) {
    if (homeUsers.length > 1 && awayUsers.length > 1) {
        return "Fair Sim";
    }
    if (homeUsers.length > 1) {
        return "FW Home"
    }
    if (awayUsers.league > 1) {
        return "FW Away";
    }
    throw Error("we should not have gotten here!");
}

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

async function forceWin(fwChannel, gameChannel, result) {
    const res = await DiscordRequest(`/channel/${gameChannel}`, { method: 'GET' });
    const channel = await res.json()
    const channelName = channel.name;
    const message = `${channelName}: ${result}`;
    await DiscordRequest(`/channels/${fwChannel}/messages`, { method: 'POST', body: { content: message } });
    await DiscordRequest(`/channels/${cId}`, { method: 'DELETE' });
    return true;
}

async function ping(gameChannel, teams) {
    const res = await DiscordRequest(`/channel/${gameChannel}`, { method: 'GET' });
    const channel = await res.json()
    const channelName = channel.name;
    const channelTeams = channelName.split("-vs-").map(t => t.replace("-", " "));
    const content = channelTeams.map(t => {
        const user = teams[findTeam(teams, t)].discordUser;
        if (user) {
            return `<@${user}>`;
        } else {
            return "";
        }
    }).join(" ").trim();
    await DiscordRequest(`/channels/${gameChannel}/messages`, { method: 'POST', body: { content: `${content} is your game scheduled? Schedule it! or react to my first message to set it as scheduled!` } });
    return true;
}

exports.handler = async function (event, context) {
    const { guild_id, currentChannels, users } = JSON.parse(event.body);

    const docRef = doc(db, "leagues", guild_id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        console.log(`no league found for ${guild_id}`)
        return;
    }
    let league = docSnap.data();

    // delete channels not there
    const channelStates = league.commands.game_channels.channels;
    Object.keys(channelStates).filter(cId => !currentChannels.includes(cId))
        .forEach(cId => league.commands.game_channels.channels[cId] = deleteField());
    await updateDoc(docRef, league);

    const updatedSnap = await getDoc(docRef);
    league = updatedSnap.data();

    const promises = currentChannels.map(cId => {
        const currentState = league.commands.game_channels.channels[cId];
        if (!currentState) {
            return Promise.resolve({});
        }
        currentState.events = currentState.events || [];
        if (currentState.event.includes("DONE")) {
            return Promise.resolve(currentState);
        }
        // first if we havent reacted, we must react
        if (currentState.events.includes("REACTED")) {
            try {
                currentState.events.push("REACTED");
                return react(cId, currentState.message);
                
            } catch (e) {
                console.error(`guild ${guild_id} failed to react error: ${e}`);
                return Promise.resolve(currentState);
            }
        } else {
            const ggUsers = getReactedUsers(cId, currentState.message, "gg");
            const scheduledUsers = getReactedUsers(cId, currentState.message, "sch");
            const homeUsers = getReactedUsers(cId, currentState.message, "home");
            const awayUsers = getReactedUsers(cId, currentState.message, "away");
            const fwUsers = getReactedUsers(cId, currentState.message, "fw");
            if (ggUsers.length > 1) {
                currentState.events.push("DONE");
                return DiscordRequest(`/channels/${cId}`, { method: 'DELETE' }).then(_ => currentState);
            }
            if (fwUsers > 1) {
                if (league.commands.game_channels.adminRole) {
                    const admins = users.filter(u => u.roles.includes(league.commands.game_channels.adminRole)).map(u => u.id);
                    if (fwUsers.filter(u => admins.includes(u.id)).length >= 1) {
                        try {
                            const result = decideResult(homeUsers, awayUsers);
                            return forceWin(league.commands.game_channels.fwChannel, cId, result).then(_ => {
                                currentState.events.push("DONE");
                                return currentState;
                            });
                        } catch (e) {
                            console.warn(`FW requested but no home or away option chosen. Doing nothing ${guild_id}, ${channelId}`);
                            return Promise.resolve(currentState);
                        }
                    } else if(currentState.events.includes("FW_REQUESTED")) {
                        const message = `FW requested <@&${league.commands.game_channels.adminRole}>`;
                        return DiscordRequest(`/channels/${cId}/messages`, { method: 'POST', body: { content: message } }).then(_ => {
                            currentState.events.push("FW_REQUESTED");
                            return currentState;
                        });
                    }
                } else {
                    try {
                        const result = decideResult(homeUsers, awayUsers);
                        return forceWin(league.commands.game_channels.fwChannel, cId, result).then(_ => {
                            currentState.events.push("DONE");
                            return currentState;
                        });
                    } catch (e) {
                        console.warn(`FW requested but no home or away option chosen. Doing nothing ${guild_id}, ${channelId}`);
                        return Promise.resolve(currentState);
                    }

                }
            }

            if (scheduledUsers.length === 1) {
                const waitPing = league.commands.game_channels.waitPing || 12;
                const now = new Date();
                const last = new Date(currentState.lastNotified);
                const hoursSince = (now - last) / 36e5;
                if (hoursSince > waitPing) {
                    currentState.lastNotified = new Date().getTime();
                    return ping(cId, league.teams).then(_ => currentState);
                }
            }
        }
    });
    const res = await Promise.all(promises);
    await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
}