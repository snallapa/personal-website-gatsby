import { initializeApp } from "firebase/app"

import { DiscordRequestCommunity } from "../../modules/utils.js"
import { getMediaInteraction, getMedia } from "../../modules/firebase-db.js"
import fetch from "node-fetch"
import { Configuration, OpenAIApi } from "openai"

const configuration = new Configuration({
  apiKey: process.env.MEDIA_OPENAI_KEY,
})

const openai = new OpenAIApi(configuration)

function findWeekAndGame(weeks, scheduleId) {
  const weekNums = Object.keys(weeks)
  for (const weekNum of weekNums) {
    const week = weeks[weekNum]
    const game = week.find((g) => g.scheduleId === scheduleId)
    if (game) {
      return { weekNum, game }
    }
  }
  throw new Error(`could not find ${scheduleId} in ${weeks}`)
}

function getTeamPlayerStats(league, weekNum, teamId) {
  const playerStats = league.stats.reg[weekNum]["player-stats"]
  return Object.keys(playerStats)
    .map((rosterId) => {
      const stats = playerStats[rosterId].stats
      const teamId = playerStats[rosterId].teamId
      return { rosterId, stats, teamId }
    })
    .filter((r) => r.teamId === teamId)
}

const statKeyMapping = {
  defForcedFum: "FF",
  defInts: "INT",
  defSacks: "SACK",
  defTotalTackles: "TACKLES",
  recCatches: "REC",
  recTDs: "TD",
  recYds: "YDS",
  rushFum: "FUM LOST",
  rushTDs: "TD",
  rushYds: "YDS",
  fgMade: "FG MADE",
  fgAtt: "FG ATT",
  passYds: "YDS",
  passTDs: "TD",
  passInts: "INT",
  defFumRec: "Fumbles Recovered",
  defIntsRec: "Defensive INT",
  off3rdDownConvPct: "4th Down Percentage",
  offFumLost: "Fumbles Lost",
  offIntsLost: "INTs",
  offPassTDs: "TD",
  offPassYds: "Pass YDS",
  offRedZonePct: "Redzone Percentage",
  offRushTDs: "Rush TD",
  offRushYds: "Rush YDS",
  offTotalYds: "Total YDS",
  tODiff: "TO DIFF",
}

function formatStats(teamStats, playerStats, roster, teamName) {
  const tStats = JSON.parse(teamStats)
  const playerMessage = playerStats
    .map((p) => {
      const pStats = JSON.parse(p.stats)
      const { name } = roster[p.rosterId]
      let statString = Object.keys(pStats)
        .filter((statName) => pStats[statName] != 0 && statKeyMapping[statName])
        .map((statName) => `${pStats[statName]} ${statKeyMapping[statName]}`)
        .join(",")
      if (pStats.passComp) {
        statString = `${pStats.passComp}/${pStats.passAtt} CP/ATT ,${statString}`
      }
      return `${name}: ${statString}`
    })
    .join("\n")
  const teamStatsMessage = Object.keys(tStats)
    .filter((tStatName) => statKeyMapping[tStatName])
    .map((tStatName) => `${statKeyMapping[tStatName]}: ${tStats[tStatName]}`)
    .join("\n")
  return `${teamName} Stats\n${teamStatsMessage}\n${teamName} Player Stats\n${playerMessage}`
}

exports.handler = async function (event, context) {
  // console.log(event)
  const { guild_id, interaction_id, message_id } = JSON.parse(event.body)
  let request, league
  try {
    request = await getMediaInteraction(interaction_id)
    league = await getMedia(guild_id)
  } catch (e) {
    console.error(e)
  }
  const { scheduleId, mediaId } = request
  const weeks = league.schedules.reg

  const { weekNum, game } = findWeekAndGame(weeks, Number(scheduleId))
  const { awayScore, homeScore, awayTeamId, homeTeamId } = game
  const homeTeamStats = league.stats.reg[weekNum]["team-stats"][homeTeamId]
  const awayTeamStats = league.stats.reg[weekNum]["team-stats"][awayTeamId]
  const homeTeamPlayerStats = getTeamPlayerStats(league, weekNum, homeTeamId)
  const awayTeamPlayerStats = getTeamPlayerStats(league, weekNum, awayTeamId)
  const { teamName: homeTeamName, roster: homeTeamRoster } =
    league.teams[homeTeamId]
  const { teamName: awayTeamName, roster: awayTeamRoster } =
    league.teams[awayTeamId]
  const homeTeamMessage = formatStats(
    homeTeamStats,
    homeTeamPlayerStats,
    homeTeamRoster,
    homeTeamName
  )
  const awayTeamMessage = formatStats(
    awayTeamStats,
    awayTeamPlayerStats,
    awayTeamRoster,
    awayTeamName
  )
  console.log(homeTeamMessage)
  console.log(awayTeamMessage)
}
