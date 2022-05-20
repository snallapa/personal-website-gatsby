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
    const currentPath = paths[paths.length - 1];

    if (currentPath == "leagueteams") {
        const { leagueTeamInfoList: teamsData } = JSON.parse(event.body)
        let teams = {}
        Object.keys(teamsData).map((teamId) => {
            teams[teamId] = {teamName: teamsData[teamId].displayName, abbr: teamsData[teamId].abbrName}
        })
        console.log(teams);
        try {
            
            await setDoc(doc(db, "leagues", league), {
                guild_id: guild_id,
                teams: teams,
            });
            console.log(`doc written with id`)
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
    return {
        statusCode: 200
    }
}