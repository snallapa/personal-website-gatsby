import {
    InteractionType,
    InteractionResponseType,
    verifyKey
  } from 'discord-interactions';
import { initializeApp } from "firebase/app";

import { getFirestore , doc, getDoc, setDoc} from "firebase/firestore";

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

function respond(message, statusCode = 200, interactionType = InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE) {
    return {
        statusCode: statusCode,
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
            type: interactionType,
            data: {
                content: message
            }
        }),
      };
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
            return respond(`Use this Url to export your league to: http://nallapareddy.com/.netlify/functions/exporter?league=${guild_id}&api=`);
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
                console.log(command);
                return respond("still working");
            } else if (subcommand === "open") {
                return respond("still working");
            }
        } else if (name === "create_game_channels") {
            return respond("this command has been changed. Use `/game_channels create` instead. See https://github.com/snallapa/snallabot for more information");
        } else if (name === "clear_game_channels") {
            return respond("this command has been changed. Use `/game_channels clear` instead. See https://github.com/snallapa/snallabot for more information");
        } else if (name === "test") {
            console.log("test command received!")
            return respond("bot is working!");
        }
    }
    return respond("we should not have gotten here...", 400);
}