import fetch from 'node-fetch';
import { initializeApp } from "firebase/app";
import { getFirestore , doc, setDoc, collection, addDoc } from "firebase/firestore";

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

exports.handler = async function (event) {
    console.log(event);
    const { guild_id, schedulesUrl, teamsUrl, messageToken } = JSON.parse(event.body);
    const teamsFetch = fetch(teamsUrl, {
        headers: {

            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.79 Safari/537.36"
        }
    })
    const schedulesFetch = fetch(schedulesUrl, {
        headers: {

            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.79 Safari/537.36"
        }
    });
    const [teamsData, schedulesData] = await Promise.all([teamsFetch.then(res => res.json()), schedulesFetch.then(res => res.json())]);
    console.log("modifying preseason");
    const preseason = {}
    for (let i = 0; i < schedulesData.pre.length; i++) {
        const games = schedulesData.pre[i];
        if (games != null) {
            newGames = games.map(x => ({awayTeamId: x.awayTeamId, homeTeamId: x.homeTeamId }));
            preseason[`week${i}`] = newGames
        }
    }
    console.log("preseason modified");
    schedulesData.pre = preseason;
    const regularseason = {}
    for (let i = 0; i < schedulesData.reg.length; i++) {
        const games = schedulesData.reg[i];
        if (games != null) {
            newGames = games.map(x => ({awayTeamId: x.awayTeamId, homeTeamId: x.homeTeamId }));
            regularseason[`week${i}`] = newGames
        }
    }
    schedulesData.reg = regularseason;
    console.log("regular season modified");
    let teams = {}
    Object.keys(teamsData).map((teamId) => {
        teams[teamId] = {teamName: teamsData[teamId].displayName, abbr: teamsData[teamId].abbrName}
    })
    console.log("teams modified");
    try {
        console.log("writing to firebase ");
        await setDoc(doc(db, "leagues", guild_id), {
            guild_id: guild_id,
            teams: teams,
            schedules: schedulesData
        });
        const res = await DiscordRequest(`webhooks/${process.env.APP_ID}/${messageToken}/messages/@original`, {
            method: 'PATCH',
            body: {
                "content": "uploaded :) feel free to use other commands"
            }
        });
        console.log(res.ok);
    } catch (e) {
        const res = await DiscordRequest(`webhooks/${process.env.APP_ID}/${messageToken}/messages/@original`, {
            method: 'PATCH',
            body: {
                "content": "something went wrong :("
            }
        });
    }
}