import { getAllDashboardLeagues } from "../../modules/firebase-db.js"

exports.handler = async function (event, context) {
    const leagues = await getAllDashboardLeagues()
    console.log("updating " + leagues.length + " leagues")
    for (let l of leagues) {
	const res = await fetch(`https://snallabot.herokuapp.com/${l.data().guild_id}/export`, {
          method: "POST",
          body: JSON.stringify({
            week: 102,
            stage: -1,
            auto: true,
          }),
        });
	if (!res.ok) {
	    const e = await res.text();
	    console.error("Could not refresh league " + l.guildId + " error: " + e);
	}
	await new Promise(r => setTimeout(r, 3000));
    }
}
