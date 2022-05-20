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

exports.handler = async function(event, context) {
    // console.log(event)
    const league = event.queryStringParameters.league;
    const apiType = event.queryStringParameters.apiType;
    const paths = apiType.split("/");
    // 0: empty, 1: console, 2: leagueId, 3: apiType, 4 onwards specific apis
    const currentPath = paths[3];
    console.log(paths);
    if (currentPath == "leagueteams") {
        const { leagueTeamInfoList: teamsData } = JSON.parse(event.body)
        let teams = {}
        teamsData.forEach(t => teams[t.teamId] = {teamName: t.displayName, abbr: t.abbrName, username: t.userName});
        try {
            
            await setDoc(doc(db, "leagues", league), {
                guild_id: league,
                teams: teams,
            }, { merge: true });
            console.log(`teams written with id`)
            return {
                statusCode: 200
            }
        } catch (e) {
            console.error('error adding document', e)
            return {
                statusCode: 200
            }
        }
    }
    if (currentPath == "week") {
        const weekType = paths[4];
        const weekNum = paths[5];
        const weekStat = paths[6];
        if (weekStat === "schedules") {
            const { gameScheduleInfoList: schedulesRaw } = JSON.parse(event.body);
            const schedules = {};
            schedules[weekType] = {};
            schedules[weekType][`week${weekNum}`] = schedulesRaw.map(game => ({awayTeamId: game.awayTeamId, homeTeamId: game.homeTeamId, awayScore: game.awayScore, homeScore: game.homeScore}))
            try {
                await setDoc(doc(db, "leagues", league), {
                    guild_id: league,
                    schedules: schedules,
                }, { merge: true });
                console.log(`schedule written with id`)
                return {
                    statusCode: 200
                }
            } catch (e) {
                console.error('error adding document', e)
                return {
                    statusCode: 200
                }
            }
        }
    }
    return {
        statusCode: 200
    }
}