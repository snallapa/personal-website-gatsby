export function findTeam(teams, search_phrase) {
  const term = search_phrase.toLowerCase()
  for (let key in teams) {
    const currentTeam = teams[key]
    if (
      currentTeam.abbr.toLowerCase() === term ||
      currentTeam.cityName.toLowerCase() === term ||
      currentTeam.teamName.toLowerCase() === term
    ) {
      return key
    }
  }
  throw `could not find team ${search_phrase}`
}

function formatWithDivision(teams) {
  const divisions = {}
  for (let key in teams) {
    const currentTeam = teams[key]
    const currentDivision = currentTeam.division
    if (divisions.hasOwnProperty(currentDivision)) {
      divisions[currentDivision].push(currentTeam)
    } else {
      divisions[currentDivision] = [currentTeam]
    }
  }
  const openTeams = []
  let message = Object.keys(divisions)
    .sort()
    .reduce((message, division) => {
      message = message + `__**${division}**__\n`
      const teams = divisions[division]
      return teams.reduce((m, t) => {
        m =
          m +
          `${t.teamName}: ${
            t.discordUser ? "<@" + t.discordUser + ">" : "OPEN"
          }\n`
        if (!t.discordUser) {
          openTeams.push(t)
        }
        return m
      }, message)
    }, "")
  message = message + "\n"
  message =
    message + `OPEN TEAMS: ${openTeams.map((t) => t.teamName).join(", ")}`
  return message
}

function formatNormal(teams) {
  const messageTeams = {}
  for (let key in teams) {
    const currentTeam = teams[key]
    messageTeams[currentTeam.teamName] = currentTeam.discordUser
  }
  const openTeams = []
  let message = Object.keys(messageTeams)
    .sort()
    .reduce((message, team) => {
      const dUser = messageTeams[team]
      if (!dUser) {
        openTeams.push(team)
      }
      return message + `${team}: ${dUser ? "<@" + dUser + ">" : "OPEN"}\n`
    }, "")
  message = message + "\n"
  message =
    message + `OPEN TEAMS: ${openTeams.map((t) => t.teamName).join(", ")}`
  return message
}

export function createTeamsMessage(teams) {
  const k = Object.keys(teams)[0]
  if (teams[k].hasOwnProperty("division")) {
    return formatWithDivision(teams)
  } else {
    return formatNormal(teams)
  }
}
