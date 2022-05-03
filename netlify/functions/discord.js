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
    // console.log(event)
    const { type, id, data } = JSON.parse(event.body);
    if (type === InteractionType.PING) {
        return {
            statusCode: 200,
            body: JSON.stringify({ type: InteractionResponseType.PONG }),
          };
    }
    if (type === InteractionType.APPLICATION_COMMAND) {
        const { guild_id, name, resolved, options} = data;
        if (name === "import_league") {
            let teamsData, schedulesData;
            let attachmentValue = options[0].value;
            let fileUrl = resolved.attachments[attachmentValue].url;
            console.log(fileUrl);
            const teamsFetch = fetch(fileUrl, {
                headers: {
        
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.79 Safari/537.36"
                }
            })
            const schedulesFetch = fetch(fileUrl, {
                headers: {
        
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.79 Safari/537.36"
                }
            });
            console.time("timer");
            const [res, res2] = await Promise.all([teamsFetch, schedulesFetch]);
            console.timeEnd("timer");
            if (!res.ok) {
                schedulesData = await res.text();
                console.log(res.status);
                throw new Error(JSON.stringify(schedulesData));
            } else {
                schedulesData = await res.json();
            }

            // firestore cant do array in array, make this an object
            const preseason = {}
            for (let i = 0; schedulesData.pre.length; i++) {
                preseason[`week${i}`] = schedulesData.pre[i]
            }
            schedulesData.pre = preseason;
            const regularseason = {}
            for (let i = 0; schedulesData.reg.length; i++) {
                regularseason[`week${i}`] = schedulesData.reg[i]
            }
            schedulesData.reg = regularseason
            attachmentValue = options[1].value;
            fileUrl = resolved.attachments[attachmentValue].url;
            if (!res2.ok) {
                teamsData = await res2.text();
                console.log(res2.status);
                throw new Error(JSON.stringify(teamsData));
            } else {
                teamsData = await res2.json();
            }

            try {
                await setDoc(doc(db, "leagues", guild_id), {
                    guild_id: guild_id,
                    teams: teamsData,
                    schedules: schedulesData
                });
    
                console.log(`doc written with id`)
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                          content: 'loaded!'
                        }
                    })
                  }
            } catch (e) {
                console.error('error adding document', e)
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                          content: 'sorry it failed...'
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