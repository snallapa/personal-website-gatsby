import { DiscordRequestMedia } from "../../modules/utils.js"
import {
  db,
  getMediaInteraction,
  getMedia,
  deleteMediaInteraction,
  getMediaWeek,
} from "../../modules/firebase-db.js"
import { doc, setDoc } from "firebase/firestore"
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

function stringifyWeek(weekNumber) {
  if (weekNumber === 19) {
    return "Wildcard"
  } else if (weekNumber === 20) {
    return "Divisional"
  } else if (weekNumber === 21) {
    return "Conference Championship"
  } else if (weekNumber === 22) {
    return "Pro Bowl"
  } else if (weekNumber === 23) {
    return "Super Bowl"
  }
  return `Week ${weekNumber}`
}

function getTeamPlayerStats(leagueWeek, teamId) {
  const playerStats = leagueWeek["player-stats"]
  return Object.keys(playerStats)
    .map((rosterId) => {
      return { rosterId, ...playerStats[rosterId] }
    })
    .filter((r) => r.teamId === teamId)
}

const statKeyMapping = {
  defForcedFum: "FF",
  defInts: "INT",
  defSacks: "SACK",
  defTotalTackles: "TACKLES",
  recCatches: "REC",
  recTDs: "Rec TD",
  recYds: "Rec YDS",
  rushFum: "FUM LOST",
  rushTDs: "Rush TD",
  rushYds: "Rush YDS",
  fgMade: "FG MADE",
  fgAtt: "FG ATT",
  passYds: "Passing YDS",
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
    .flatMap((p) => {
      return Object.keys(p)
        .filter((k) => k.startsWith("stats"))
        .map((k) => {
          return { ...p, stats: p[k] }
        })
    })
    .flatMap((p) => {
      const pStats = JSON.parse(p.stats)
      const { name, position } = roster[p.rosterId]
      let statString = Object.keys(pStats)
        .filter((statName) => pStats[statName] != 0 && statKeyMapping[statName])
        .map((statName) => `${pStats[statName]} ${statKeyMapping[statName]}`)
        .join(", ")
      if (pStats.passComp) {
        statString = `${pStats.passComp}/${pStats.passAtt} CP/ATT, ${statString}`
      }
      if (statString) {
        return [`${position} ${name}: ${statString}`]
      } else {
        return []
      }
    })
    .join("\n")
  const teamStatsMessage = Object.keys(tStats)
    .filter((tStatName) => statKeyMapping[tStatName])
    .map((tStatName) => `${statKeyMapping[tStatName]}: ${tStats[tStatName]}`)
    .join("\n")
  return `${teamName} Stats\n${teamStatsMessage}\n${teamName} Player Stats\n${playerMessage}`
}

function splitter(str, l) {
  var strs = []
  while (str.length > l) {
    var pos = str.substring(0, l).lastIndexOf(" ")
    pos = pos <= 0 ? l : pos
    strs.push(str.substring(0, pos))
    var i = str.indexOf(" ", pos) + 1
    if (i < pos || i > pos + l) i = pos
    str = str.substring(i)
  }
  strs.push(str)
  return strs
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
  const weekNumber = Number(weekNum.replace("week", ""))
  const leagueWeek = await getMediaWeek(guild_id, weekNumber)
  const { awayScore, homeScore, awayTeamId, homeTeamId } = game
  const homeTeamStats = leagueWeek["team-stats"][homeTeamId]
  const awayTeamStats = leagueWeek["team-stats"][awayTeamId]
  const homeTeamPlayerStats = getTeamPlayerStats(leagueWeek, homeTeamId)
  const awayTeamPlayerStats = getTeamPlayerStats(leagueWeek, awayTeamId)
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
  const mediaPersonality =
    mediaId === "first_take"
      ? "Stephen A Smith"
      : "Skip Bayless and Shannon Sharpe"
  const weekString = stringifyWeek(weekNumber)
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-16k",
    messages: [
      {
        role: "system",
        content: `You are impersonating the personality of ${mediaPersonality} and will be given a NFL game to talk about in their voice including funny exclamations, interesting banter, and the way they talk and get riled up. Include some players that they hate and love and try to make this as unique as possible. Ways to make this unique would be to blame coaching, bad roster or team building, or bad performances every once in a while if it seems fitting. It would be great to include important stats from the game and highlight high performing players. `,
      },
      {
        role: "user",
        content: `In less than 2000 characters, talk about this ${weekString} NFL game between the ${awayTeamName} and ${homeTeamName}. The score was ${awayTeamName} ${awayScore} - ${homeScore} ${homeTeamName}. Here are the stats for the game:\n${homeTeamMessage}\n${awayTeamMessage}`,
      },
    ],
  })
  const generatedMessage = completion.data.choices[0].message
  const channel = league.commands.media.channel
  const title = [
    `**__What ${mediaPersonality} had to say about the ${weekString} game between ${awayTeamName} and ${homeTeamName}__**`,
  ]
  const splitMessage = title.concat(splitter(generatedMessage.content, 1000))
  for (const partMessage of splitMessage) {
    await DiscordRequestMedia(`channels/${channel}/messages`, {
      method: "POST",
      body: {
        content: partMessage,
        allowed_mentions: {
          parse: [],
        },
      },
    })
  }
  await deleteMediaInteraction(interaction_id)
  await setDoc(
    doc(db, "media", guild_id),
    {
      commands: {
        media: {
          lastGeneratedTime: new Date().getTime(),
        },
      },
    },
    { merge: true }
  )
}
