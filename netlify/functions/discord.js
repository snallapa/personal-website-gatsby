import {
    InteractionType,
    InteractionResponseType,
    verifyKey
  } from 'discord-interactions';
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
    console.log(options);
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
        console.log(res.status);
        throw new Error(JSON.stringify(data));
    }
    // return original response
    return res;
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
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                      content: `Use this Url to export your league to: http://nallapareddy.com/.netlify/functions/exporter?league=${guild_id}&api=`
                    }
                })
              };
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
            console.log(event);
        }
        else if (name === "create_game_channels") {
            const week = options[0].value;
            const category = options[1].value;

            const docRef = doc(db, "leagues", guild_id);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                          content: `no league found for ${guild_id}, try import_league first`
                        }
                    })
                  }
            }
            const league = docSnap.data();

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
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                          content: `created!`
                        }
                    })
                  };
            } else {
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                          content: `hmm something went wrong!`
                        }
                    })
                  };
            }

        } else if (name === "clear_game_channels") {
            const category = options[0].value;
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
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                          content: `done, all game channels were deleted!`
                        }
                    })
                  };
            } else {
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                          content: `hmm something went wrong :(, not all of them were deleted`
                        }
                    })
                  };
            }
        } else if (name === "test") {
            console.log("test command received!")
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                      content: 'bot is working!'
                    }
                })
              };
        }
    }
    return {
        statusCode: 400,
        body: JSON.stringify({ type: "we should not have gotten here" }),
      };
}