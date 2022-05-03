import {
    InteractionType,
    InteractionResponseType,
    verifyKey
  } from 'discord-interactions';
import { initializeApp } from "firebase/app";
import { getFirestore , doc, setDoc, collection, addDoc } from "firebase/firestore";

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


exports.handler = async function(event, context) {
    if (!verifier(event)) {
        return {
            statusCode: 401
        }
    }
    console.log(event)
    const { type, id, data } = JSON.parse(event.body);
    if (type === InteractionType.PING) {
        return {
            statusCode: 200,
            body: JSON.stringify({ type: InteractionResponseType.PONG }),
          };
    }
    if (type === InteractionType.APPLICATION_COMMAND) {
        const { guild_id, id, name, resolved, options, token} = data;
        if (name === "import_league") {
            const attachmentValue = options[0].value;
            const fileUrl = resolved.attachments[attachmentValue.url];
            const res = await fetch(fileUrl, {
                headers: {
                Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json; charset=UTF-8',
                }
            });
            if (!res.ok) {
                const data = await res.json();
                console.log(res.status);
                throw new Error(JSON.stringify(data));
            } else {
                const data = await res.json();
                console.log(data);
            }
        } else if (name === "test") {
            console.log("test command received!")
            // const res = await fetch(`https://discord.com/api/v9/interactions/${id}/${token}/callback`, {
            //     headers: {
            //         Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            //         'Content-Type': 'application/json; charset=UTF-8',
            //         },
            //     body: JSON.stringify({
            //         headers: { 'Content-Type': 'application/json'},
            //         type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            //         data: {
            //           content: 'ayyye'
            //         }
            //     }),
            //     method: 'POST'
            // });
            // console.log(res)
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                      content: 'ayyye'
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