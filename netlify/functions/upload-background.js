import fetch from 'node-fetch';
import { initializeApp } from "firebase/app";
import { getFirestore , doc, setDoc, collection, addDoc } from "firebase/firestore";

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
    const { guild_id, schedulesUrl, teamsUrl } = JSON.parse(event.body);
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
    console.log(teamsData);
    const preseason = {}
    for (let i = 0; schedulesData.pre.length; i++) {
        const games = schedulesData.pre[i];
        if (games){
            newGames = games.map(x => { x.awayTeamId, x.homeTeamId })
            preseason[`week${i}`] = newGames
        }
    }
    schedulesData.pre = preseason;
    const regularseason = {}
    for (let i = 0; schedulesData.reg.length; i++) {
        const games = schedulesData.reg[i];
        if (games) {
            newGames = games.map(x => { x.awayTeamId, x.homeTeamId })
            regularseason[`week${i}`] = newGames
        }
    }
    schedulesData.reg = regularseason;
    let teams = {}
    Object.keys(teamsData).map((teamId) => {
        teams[teamId] = {teamName: teamsData[teamId].displayName, abbr: teamsData[teamId].abbrName}
    })
    console.timeEnd("timer");
    try {
        console.log("writing to firebase");
        await setDoc(doc(db, "leagues", guild_id), {
            guild_id: guild_id,
            teams: teams,
            schedules: schedulesData
        });
        console.log(`doc written with id`)
    } catch (e) {
        console.error('error adding document', e)
    }
}