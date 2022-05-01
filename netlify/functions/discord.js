import {
    InteractionType,
    InteractionResponseType,
    verifyKey
  } from 'discord-interactions';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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


function VerifyDiscordRequest(clientKey) {
  return function (event) {
    const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];
    const isValidRequest = verifyKey(event.body, signature, timestamp, clientKey);
    return isValidRequest;
  };
}

const verifier = VerifyDiscordRequest(process.env.PUBLIC_KEY);

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
    return {
        statusCode: 200,
        body: JSON.stringify({ type: "NOT PONG" }),
      };
}