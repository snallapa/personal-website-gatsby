import {
    InteractionType,
    InteractionResponseType,
    verifyKey
  } from 'discord-interactions';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
 
import fetch from 'node-fetch';

const firebaseConfig = {
    apiKey: "AIzaSyDf9ZiTBWf-sWY007WsKktMPewcrs07CWw",
    authDomain: "championslounge-f0f36.firebaseapp.com",
    projectId: "championslounge-f0f36",
    storageBucket: "championslounge-f0f36.appspot.com",
    messagingSenderId: "163156624093",
    appId: "1:163156624093:web:dfe860c8bb38a62b075134"
};


function VerifyDiscordRequest(clientKey) {
  return function (event) {
    const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];
    const isValidRequest = verifyKey(event.body, signature, timestamp, clientKey);
    return isValidRequest;
  };
}

const verifier = VerifyDiscordRequest(process.env.PUBLIC_KEY);

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
        console.log(res);
        throw new Error(JSON.stringify(data));
    }
    // return original response
    return res;
}

function respond(message, statusCode = 200, interactionType = InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE) {
    return {
        statusCode: statusCode,
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
            type: interactionType,
            data: {
                content: message,
            }
        }),
      };
}

function respondNoMention(message) {
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: message,
                allowed_mentions: {
                    parse: []
                }
            }
        }),
      };
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


function formatWithDivision(teams) {
    const divisions = {}
    for (let key in teams) {
        const currentTeam = teams[key];
        const currentDivision = currentTeam.division;
        if (divisions.hasOwnProperty(currentDivision)) {
            divisions[currentDivision].push(currentTeam);
        } else {
            divisions[currentDivision] = [currentTeam]
        }
    }
    const openTeams = []
    let message = Object.keys(divisions).sort().reduce((message, division) => {
        message = message + `__**${division}**__\n`;
        const teams = divisions[division];
        return teams.reduce((m, t) => {
            m = m + `${t.teamName}: ${t.discordUser ? "<@" + t.discordUser + ">" : "OPEN"}\n`;
            if (!t.discordUser) {
                openTeams.push(t);
            }
            return m;
        }, message)
    }, "")
    message = message + "\n";
    message = message + `OPEN TEAMS: ${openTeams.map(t => t.teamName).join(", ")}`
    return message;
}

function formatNormal(teams) {
    const messageTeams = {}
    for (let key in teams) {
        const currentTeam = teams[key];
        messageTeams[currentTeam.teamName] = currentTeam.discordUser;
    }
    const openTeams = []
    let message = Object.keys(messageTeams).sort().reduce((message, team) => {
        const dUser = messageTeams[team];
        if (!dUser) {
            openTeams.push(team);
        }
        return message + `${team}: ${dUser ? "<@" + dUser + ">" : "OPEN"}\n`;
    }, "");
    message = message + "\n";
    message = message + `OPEN TEAMS: ${openTeams.map(t => t.teamName).join(", ")}`
    return message;
}

function createTeamsMessage(teams) {
    const k = Object.keys(teams)[0];
    if (teams[k].hasOwnProperty("division")) {
        return formatWithDivision(teams);
    } else {
        return formatNormal(teams);
    }
}

function createStreamsMessage(counts) {
    const countsList = Object.keys(counts).map(user => ({user: user, count: counts[user]}));
    const sortedCountsList = countsList.sort((a,b) => (a.count > b.count) ? -1 : 1);
    // sort the countsList
    return "__**Streams**__\n" + sortedCountsList.map(userCount => `<@${userCount.user}>: ${userCount.count}`).join("\n").trim();
}

function createWaitlistMessage(waitlist) {
    return "__**Waitlist**__\n" + waitlist.map((user, idx) => `${idx + 1}: <@${user}>`).join("\n");
}

function notifyWaitlist(waitlist, top) {
    return "__**Open Team Availiable**__\n" + "You turn is here:\n" + waitlist.filter((_, idx) => idx < top).map((user, idx) => `${idx + 1}: <@${user}>`).join("\n");
}


exports.handler = async function(event, context) {
    if (!verifier(event)) {
        return {
            statusCode: 401
        }
    }
    // console.log(event)
    const { type, guild_id, data, token } = JSON.parse(event.body);
    if (type === InteractionType.PING) {
        return {
            statusCode: 200,
            body: JSON.stringify({ type: InteractionResponseType.PONG }),
          };
    }
    if (type === InteractionType.APPLICATION_COMMAND) {
        const {name, resolved, options} = data;

        if (name === "league_export") {
            return respond(`Type this URL carefully into your app (no spaces exactly as shown here): http://snallabot.herokuapp.com/${guild_id}`);
        } else if (name === "import_league") { // not recommended anymore
            console.log(guild_id);

            // let teamsData, schedulesData;
            const attachmentValue = options[0].value;
            const attachmentValue2 = options[1].value
            const schedulesUrl = resolved.attachments[attachmentValue].url;
            const teamsUrl = resolved.attachments[attachmentValue2].url; 
            console.log("sending request to background function");
            const res = await fetch("https://nallapareddy.com/.netlify/functions/upload-background", {
                method: 'POST',
                body: JSON.stringify({
                    guild_id: guild_id,
                    schedulesUrl: schedulesUrl, 
                    teamsUrl: teamsUrl,
                    messageToken: token
                })
            });
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                      content: 'got it! uploading...'
                    }
                })
              };

        } else if (name === "game_channels") {
            const command = options[0];
            const subcommand = command.name;
            if (subcommand === "configure") {
                const category = command.options[0].value
                await setDoc(doc(db, "leagues", guild_id), {
                    commands: {
                        game_channels: {
                            category: category
                        }
                    }
                }, { merge: true });
                return respond("configured! game channels command is ready for use");
            } else if (subcommand === "create") {
                const week = command.options[0].value;
                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    return respond(`no league found for ${guild_id}, export in MCA using league_export first`);
                }
                const league = docSnap.data();
                let category;
                try {
                    category = league.commands.game_channels.category
                } catch (error) {
                    return respond('missing configuration, run `/game_channels configure` first');
                }
                if (!league.schedules.reg || !league.schedules.reg[`week${week}`]) {
                    return respond(`missing week ${week}. Please export the week in MCA (select ALL WEEKS in the app!)`);
                }

                if (week > 18) {
                    return respond(`sorry I dont know about playoffs :(`);
                }

                const weeksGames = league.schedules.reg[`week${week}`];
                const teams = league.teams;
                const channelPromises = weeksGames.map(game => {
                    return DiscordRequest(`guilds/${guild_id}/channels`, {
                        method: 'POST',
                        body: {
                            type: 0,
                            name: `${teams[game.awayTeamId].teamName}-vs-${teams[game.homeTeamId].teamName}`,
                            parent_id: category
                        }
                    });
                });
                const responses = await Promise.all(channelPromises);
                if (responses.every(r => r.ok)) {
                    return respond("created!");
                } else {
                    return respond("something went wrong... maybe try again or contact owner");
                }
            } else if (subcommand === "clear") {
                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    return respond(`no league found for ${guild_id}, export in MCA using league_export first`);
                }
                const league = docSnap.data();
                let category;
                try {
                    category = league.commands.game_channels.category
                } catch (error) {
                    return respond('missing configuration, run `/game_channels configure` first');
                }
                const res = await DiscordRequest(`guilds/${guild_id}/channels`, {
                    method: 'GET',
                });
                const channels = await res.json();
                const gameChannelIds = channels.filter(c => {
                    // text channel, in right category, with `vs` in it
                    return c.type === 0 && c.parent_id && c.parent_id === category && c.name.includes("vs");
                    }).map(c => c.id);
                const deletePromises = gameChannelIds.map(id => DiscordRequest(`/channels/${id}`, {method: 'DELETE'}));
                const responses = await Promise.all(deletePromises);
                if (responses.every(r => r.ok)) {
                    return respond("done, all game channels were deleted!");
                } else {
                    return respond("hmm something went wrong :(, not all of them were deleted");
                }
            } else if (subcommand === "notify") {
                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    return respond(`no league found for ${guild_id}, export in MCA using league_export first`);
                }
                const league = docSnap.data();
                let category;
                try {
                    category = league.commands.game_channels.category
                } catch (error) {
                    return respond('missing configuration, run `/game_channels configure` first');
                }
                const res = await DiscordRequest(`guilds/${guild_id}/channels`, {
                    method: 'GET',
                });
                const channels = await res.json();
                const messagePromises = channels.filter(c => {
                    // filter on optional parameter
                    if (command.options && command.options[0]) {
                        const channelId = command.options[0].value;
                        return c.id === channelId;
                    }
                    // text channel, in right category, with `vs` in it
                    return c.type === 0 && c.parent_id && c.parent_id === category && c.name.includes("vs");
                    }).flatMap(c => {
                        console.log(c.name);
                        const channelId = c.id;
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
                            })];
                        } else {
                            return [];
                        }
                    });
                const responses = await Promise.all(messagePromises);
                if (responses.every(r => r.ok)) {
                    return respond("all users notified!");
                } else {
                    return respond("hmm something went wrong :(, not all of them were notified");
                }
            }
        } else if (name === "teams") {
            const command = options[0];
            const subcommand = command.name;
            if (subcommand === "configure") {
                const channel = command.options[0].value
                await setDoc(doc(db, "leagues", guild_id), {
                    commands: {
                        teams: {
                            channel: channel
                        }
                    }
                }, { merge: true });
                return respond("configured! teams command is ready for use");
            } else if (subcommand === "assign") {
                const team = command.options[0].value;
                const user = command.options[1].value;

                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    return respond(`no league found for ${guild_id}, export in MCA using league_export first`);
                }
                const league = docSnap.data();
                const teams = league.teams;
                let teamKey;
                try {
                    teamKey = findTeam(teams, team);
                } catch (e) {
                    return respond(`could not find the team ${team}! try using abbreviation, full name, or city name`);
                }
                league.teams[teamKey].discordUser = user;
                try {
                    const content = createTeamsMessage(league.teams);
                    if (league.commands.teams.message) {
                        const messageId = league.commands.teams.message;
                        const channelId = league.commands.teams.channel;
                        try {
                            const res = await DiscordRequest(`channels/${channelId}/messages/${messageId}`, {
                                method: 'PATCH',
                                body: {
                                    content: content,
                                    allowed_mentions: {
                                        parse: []
                                    }
                                }
                            });
                            const data = await res.json();
                            league.commands.teams.message = data.id;
                        } catch (e) {
                            console.log(e);
                            league.commands.teams.message = "";
                            await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                            return respond("team assigned, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel");
                        }
                    } else {
                        const channelId = league.commands.teams.channel;
                        try {
                            const res = await DiscordRequest(`channels/${channelId}/messages`, {
                                method: 'POST',
                                body: {
                                    content: content,
                                    allowed_mentions: {
                                        parse: []
                                    }
                                }
                            });
                            const data = await res.json();
                            league.commands.teams.message = data.id;
                        } catch (e) {
                            console.log(e);
                            league.commands.teams.message = "";
                            await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                            return respond("team assigned, but I couldnt send my message :(. This could mean a permissions issues on the bot or on the channel");
                        }
                    }
                    await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                    return respond("team assigned!");
                } catch (e) {
                    console.log(e);
                    return respond("could not assign team :(")
                }
            } else if (subcommand === "open") {
                const team = command.options[0].value;

                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    return respond(`no league found for ${guild_id}, export in MCA using league_export first`);
                }
                const league = docSnap.data();
                const teams = league.teams;
                let teamKey;
                try {
                    teamKey = findTeam(teams, team);
                } catch (e) {
                    return respond(`could not find the team ${team}! try using abbreviation, full name, or city name`);
                }
                league.teams[teamKey].discordUser = "";
                try {
                    const content = createTeamsMessage(league.teams);
                    if (league.commands.teams.message) {
                        const messageId = league.commands.teams.message;
                        const channelId = league.commands.teams.channel;
                        try {
                            const res = await DiscordRequest(`channels/${channelId}/messages/${messageId}`, {
                                method: 'PATCH',
                                body: {
                                    content: content,
                                    allowed_mentions: {
                                        parse: []
                                    }
                                }
                            });
                            const data = await res.json()
                            league.commands.teams.message = data.id;
                        } catch (e) {
                            console.log(e);
                            league.commands.teams.message = "";
                            await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                            return respond("team opened, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel");
                        }
                    } else {
                        try {
                            const channelId = league.commands.teams.channel;
                            const res = await DiscordRequest(`channels/${channelId}/messages`, {
                                method: 'POST',
                                body: {
                                    content: content
                                }
                            });
                            const data = await res.json();
                            league.commands.teams.message = data.id;
                        } catch (e) {
                            console.log(e);
                            league.commands.teams.message = "";
                            await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                            return respond("team opened, but I couldnt send my message :(. This could mean a permissions issues on the bot or on the channel");
                        }
                    }
                    await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                    return respond("team freed!");
                } catch (e) {
                    console.log(e);
                    return respond("could not free team :(")
                }
            }
        } else if (name === "streams") {
            const command = options[0];
            const subcommand = command.name;
            if (subcommand === "configure") {
                const channel = command.options[0].value
                await setDoc(doc(db, "leagues", guild_id), {
                    commands: {
                        streams: {
                            channel: channel,
                            counts: {}
                        }
                    }
                }, { merge: true });
                return respond("configured! streams command is ready for use");
            } else if (subcommand === "count") {
                const user = command.options[0].value;
                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    return respond(`no league found for ${guild_id}, export in MCA using league_export first`);
                }
                const league = docSnap.data();
                if (!league.commands || !league.commands.streams || !league.commands.streams.channel) {
                    return respond("streams is not configured yet. Configure it first");
                }
                const currentUserCount = league.commands.streams.counts[user] || 0;
                const newCount = command.options[1] ? command.options[1].value : currentUserCount + 1;
                league.commands.streams.counts[user] = newCount;
                const content = createStreamsMessage(league.commands.streams.counts);
                try {
                    if (league.commands.streams.message) {
                        const messageId = league.commands.streams.message;
                        const channelId = league.commands.streams.channel;
                        try {
                            const res = await DiscordRequest(`channels/${channelId}/messages/${messageId}`, {
                                method: 'PATCH',
                                body: {
                                    content: content,
                                    allowed_mentions: {
                                        parse: []
                                    }
                                }
                            });
                            const data = await res.json();
                            league.commands.streams.message = data.id;
                        } catch (e) {
                            console.log(e);
                            league.commands.streams.message = "";
                            await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                            return respond("stream count updated, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel");
                        }
                    } else {
                        const channelId = league.commands.streams.channel;
                        try {
                            const res = await DiscordRequest(`channels/${channelId}/messages`, {
                                method: 'POST',
                                body: {
                                    content: content,
                                    allowed_mentions: {
                                        parse: []
                                    }
                                }
                            });
                            const data = await res.json();
                            league.commands.streams.message = data.id;
                        } catch (e) {
                            console.log(e);
                            league.commands.streams.message = "";
                            await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                            return respond("stream count updated, but I couldnt send my message :(. This could mean a permissions issues on the bot or on the channel");
                        }
                    }
                    await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                    return respond("stream count updated!");
                } catch (e) {
                    console.log(e);
                    return respond("could not update stream count :(")
                }
            } else if (subcommand === "remove") {
                const user = command.options[0].value;
                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    return respond(`no league found for ${guild_id}, export in MCA using league_export first`);
                }
                const league = docSnap.data();
                if (!league.commands || !league.commands.streams || !league.commands.streams.channel) {
                    return respond("streams is not configured yet. Configure it first");
                }
                delete league.commands.streams.counts[user];
                const content = createStreamsMessage(league.commands.streams.counts);
                try {
                    if (league.commands.streams.message) {
                        const messageId = league.commands.streams.message;
                        const channelId = league.commands.streams.channel;
                        try {
                            const res = await DiscordRequest(`channels/${channelId}/messages/${messageId}`, {
                                method: 'PATCH',
                                body: {
                                    content: content,
                                    allowed_mentions: {
                                        parse: []
                                    }
                                }
                            });
                            const data = await res.json();
                            league.commands.streams.message = data.id;
                        } catch (e) {
                            console.log(e);
                            league.commands.streams.message = "";
                            await setDoc(doc(db, "leagues", guild_id), league);
                            return respond("user removed from streams, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel");
                        }
                    } else {
                        const channelId = league.commands.streams.channel;
                        try {
                            const res = await DiscordRequest(`channels/${channelId}/messages`, {
                                method: 'POST',
                                body: {
                                    content: content,
                                    allowed_mentions: {
                                        parse: []
                                    }
                                }
                            });
                            const data = await res.json();
                            league.commands.streams.message = data.id;
                        } catch (e) {
                            console.log(e);
                            league.commands.streams.message = "";
                            await setDoc(doc(db, "leagues", guild_id), league);
                            return respond("user removed from streams, but I couldnt send my message :(. This could mean a permissions issues on the bot or on the channel");
                        }
                    }
                    await setDoc(doc(db, "leagues", guild_id), league);
                    return respond("user removed from streams!");
                } catch (e) {
                    console.log(e);
                    return respond("could not remove user from streams :(");
                }
            } else if (subcommand === "reset") {
                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    return respond(`no league found for ${guild_id}, export in MCA using league_export first`);
                }
                const league = docSnap.data();
                if (!league.commands || !league.commands.streams || !league.commands.streams.channel) {
                    return respond("streams is not configured yet. Configure it first");
                }
                Object.keys(league.commands.streams.counts).forEach(user => {
                    league.commands.streams.counts[user] = 0;
                });
                const content = createStreamsMessage(league.commands.streams.counts);
                try {
                    if (league.commands.streams.message) {
                        const messageId = league.commands.streams.message;
                        const channelId = league.commands.streams.channel;
                        try {
                            const res = await DiscordRequest(`channels/${channelId}/messages/${messageId}`, {
                                method: 'PATCH',
                                body: {
                                    content: content,
                                    allowed_mentions: {
                                        parse: []
                                    }
                                }
                            });
                            const data = await res.json();
                            league.commands.streams.message = data.id;
                        } catch (e) {
                            console.log(e);
                            league.commands.streams.message = "";
                            await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                            return respond("streams reset, but I couldnt update my message :(. This could mean a permissions issues on the bot or on the channel");
                        }
                    } else {
                        const channelId = league.commands.streams.channel;
                        try {
                            const res = await DiscordRequest(`channels/${channelId}/messages`, {
                                method: 'POST',
                                body: {
                                    content: content,
                                    allowed_mentions: {
                                        parse: []
                                    }
                                }
                            });
                            const data = await res.json();
                            league.commands.streams.message = data.id;
                        } catch (e) {
                            console.log(e);
                            league.commands.streams.message = "";
                            await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                            return respond("streams reset, but I couldnt send my message :(. This could mean a permissions issues on the bot or on the channel");
                        }
                    }
                    await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                    return respond("streams reset!");
                } catch (e) {
                    console.log(e);
                    return respond("could not reset streams :(");
                }
            }
        } else if (name === "waitlist") {
            const command = options[0];
            const subcommand = command.name;
            if (subcommand === "list") {

                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                let league;
                if (!docSnap.exists()) {
                    league = {commands: {waitlist: []}};
                    await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                } else {
                    league = docSnap.data();
                }
                if (!league.commands || !league.commands.waitlist || league.commands.waitlist.length === 0) {
                    return respond("there is no one on the waitlist!");
                } else {
                    return respondNoMention(createWaitlistMessage(league.commands.waitlist));
                }
            } else if (subcommand === "add") {
                const user = command.options[0].value;
                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                let league;
                if (!docSnap.exists()) {
                    league = {commands: {waitlist: []}};
                    await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                } else {
                    league = docSnap.data();
                }
                const waitlist = league.commands.waitlist || [];
                if (command.options[1]) {
                    const position = command.options[1].value;
                    if (position > waitlist.length) {
                        return respond("invalid position, beyond the waitlist length");
                    }
                    waitlist.splice(position - 1, 0, user);
                    league.commands.waitlist = waitlist;
                } else {
                    waitlist.push(user);
                    league.commands.waitlist = waitlist;
                }
                await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                if (!league.commands || !league.commands.waitlist || league.commands.waitlist.length === 0) {
                    return respond("there is no one on the waitlist!");
                } else {
                    return respondNoMention(createWaitlistMessage(league.commands.waitlist));
                }
            } else if (subcommand === "remove") {
                const user = command.options[0].value;
                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                let league;
                if (!docSnap.exists()) {
                    league = {commands: {waitlist: []}};
                    await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                } else {
                    league = docSnap.data();
                }
                const waitlist = league.commands.waitlist || [];
                league.commands.waitlist = waitlist.filter(w => w !== user);
                await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                if (!league.commands || !league.commands.waitlist || league.commands.waitlist.length === 0) {
                    return respond("there is no one on the waitlist!");
                } else {
                    return respondNoMention(createWaitlistMessage(league.commands.waitlist));
                }
            } else if (subcommand === "pop") {
                const position = command.options[0] ? command.options[0].value : 1;
                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                let league;
                if (!docSnap.exists()) {
                    league = {commands: {waitlist: []}};
                    await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                } else {
                    league = docSnap.data();
                }
                const waitlist = league.commands.waitlist || [];
                if (waitlist.length === 0) {
                    return respond("waitlist is empty");
                }
                league.commands.waitlist = waitlist.filter((_, idx) => idx !== (position - 1));
                await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                if (!league.commands || !league.commands.waitlist || league.commands.waitlist.length === 0) {
                    return respond("there is no one on the waitlist!");
                } else {
                    return respondNoMention(createWaitlistMessage(league.commands.waitlist));
                }
            } else if (subcommand === "notify") {
                const top = command.options[0] ? command.options[0].value : 1;
                const docRef = doc(db, "leagues", guild_id);
                const docSnap = await getDoc(docRef);
                let league;
                if (!docSnap.exists()) {
                    league = {commands: {waitlist: []}};
                    await setDoc(doc(db, "leagues", guild_id), league, { merge: true });
                } else {
                    league = docSnap.data();
                }
                const waitlist = league.commands.waitlist || [];
                if (waitlist.length === 0) {
                    return respond("waitlist is empty");
                }
                return respond(notifyWaitlist(league.commands.waitlist, top));
            }
        } else if (name === "schedule") {
            const week = options[0].value;
            const docRef = doc(db, "leagues", guild_id);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                return respond(`no league found for ${guild_id}, export in MCA using league_export first`);
            }
            const league = docSnap.data();
            if (!league.schedules.reg || !league.schedules.reg[`week${week}`]) {
                return respond(`missing week ${week}. Please export the week in MCA (select ALL WEEKS in the app!)`);
            }
            if (week > 18) {
                return respond(`sorry I dont know about playoffs :(`);
            }

            const weeksGames = league.schedules.reg[`week${week}`];
            const teams = league.teams;
            const gamesContent = weeksGames.map(game => `${teams[game.awayTeamId].teamName} vs ${teams[game.homeTeamId].teamName}`).join("\n");
            const scheduleContent = `__**Week ${week}**__\n${gamesContent}`;
            return respond(scheduleContent);
        }
        else if (name === "create_game_channels") {
            return respond("this command has been changed. Use `/game_channels create` instead. See https://github.com/snallapa/snallabot for more information");
        } else if (name === "clear_game_channels") {
            return respond("this command has been changed. Use `/game_channels clear` instead. See https://github.com/snallapa/snallabot for more information");
        } else if (name === "test") {
            console.log("test command received!")
            return respond("bot is working!");
        }
    }
    return respond("we should not have gotten here... this command is broken contact owner");
}