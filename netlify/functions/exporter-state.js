import fetch from "node-fetch"
import { getLeague } from "../../modules/firebase-db.js"

exports.handler = async function (event, context) {
  const body = JSON.parse(event.body)
  const { guild_id } = body
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        state: "INITIATE_LOGIN",
        league: {},
      }),
    }
  }
  const { madden_server: tokenInfo } = league
  if (!tokenInfo?.accessToken) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        state: "INITIATE_LOGIN",
        league: league,
      }),
    }
  }
  if (!tokenInfo?.leagueId) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        state: "LEAGUE_PICKER",
        league: league,
      }),
    }
  } else {
    return {
      statusCode: 200,
      body: JSON.stringify({
        state: "LEAGUE_DASHBOARD",
        league: league,
      }),
    }
  }
}
