import { getAllDashboardLeagues } from "../../modules/firebase-db.js"

exports.handler = async function (event, context) {
    const leagues = await getAllDashboardLeagues()
    console.log("will update leagues: " + leagues.map(l => l.guildId))
    // await Promise.all(leagues.map(async l => {
    // 	const res = await fetch(`https://snallabot.herokuapp.com/${l.guild_id}/export`, {
    //       method: "POST",
    //       body: JSON.stringify({
    //         week: 102,
    //         stage: -1,
    //         auto: false,
    //       }),
    //     });
    // 	if (!res.ok) {
    // 	    const e = await res.text();
    // 	    console.error("Could not refresh league " + l.guildId + " error: " + e);
    // 	    return false;
    // 	} else {
    // 	    return true;
    // 	}
    // }));
    return {
	statusCode: 200,
    };
}
