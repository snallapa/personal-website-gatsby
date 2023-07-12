import { DiscordRequestCommunity } from "../../modules/utils.js"

const TEST_COMMAND = {
  name: "test_community",
  description: "Basic guild command",
  type: 1,
}

const SETUP_NFL_COMMAND = {
  name: "setup_nfl_polls",
  description: "setup the community for nfl game polls",
  type: 1,
  options: [
    {
      type: 7, // channel
      name: "channel",
      description: "channel to create polls in",
      required: true,
      channel_types: [0],
    },
    {
      type: 5, // boolean
      name: "auto_update",
      description: "set to true to auto update polls every 10 minutes",
      required: false,
    },
  ],
}

const SETUP_NBA_COMMAND = {
  name: "setup_nba_polls",
  description: "setup the community for nba game polls",
  type: 1,
  options: [
    {
      type: 7, // channel
      name: "channel",
      description: "channel to create polls in",
      required: true,
      channel_types: [0],
    },
    {
      type: 5, // boolean
      name: "auto_update",
      description: "set to true to auto update polls every 10 minutes",
      required: false,
    },
  ],
}

const UPDATE_COMMAND_NFL = {
  name: "manual_update_nfl",
  description: "manual update poll scores",
  type: 1,
}

const UPDATE_COMMAND_NBA = {
  name: "manual_update_nba",
  description: "manual update poll scores",
  type: 1,
}

const COMMANDS = [
  TEST_COMMAND,
  SETUP_NFL_COMMAND,
  SETUP_NBA_COMMAND,
  UPDATE_COMMAND_NBA,
  UPDATE_COMMAND_NFL,
]

const DELETED_COMMANDS = []

async function InstallGuildCommand(guildId, command) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/guilds/${guildId}/commands`
  console.log(command)
  // install command
  try {
    const res = await DiscordRequestCommunity(endpoint, {
      method: "POST",
      body: command,
    })
    return res.ok
  } catch (err) {
    console.error(err)
    return false
  }
}

async function DeleteGuildCommand(guildId, commandId) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/guilds/${guildId}/commands/${commandId}`

  try {
    const res = await DiscordRequestCommunity(endpoint, { method: "DELETE" })
    return res.ok
  } catch (err) {
    console.error(err)
    return false
  }
}

async function DeleteGlobalCommand(commandId) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/commands/${commandId}`
  // install command
  try {
    const res = await DiscordRequestCommunity(endpoint, { method: "DELETE" })
    return res.ok
  } catch (err) {
    console.error(err)
    return false
  }
}

async function InstallGlobalCommand(command) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/commands`
  console.log(command)
  // install command
  try {
    const res = await DiscordRequestCommunity(endpoint, {
      method: "POST",
      body: command,
    })
    return res.ok
  } catch (err) {
    console.error(err)
    return false
  }
}

async function HasGuildCommand(guildId, command) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/guilds/${guildId}/commands`
  try {
    const res = await DiscordRequestCommunity(endpoint, { method: "GET" })
    const data = await res.json()
    console.log(data)

    if (data) {
      const installedNames = data.map((c) => c["name"])
      // This is just matching on the name, so it's not good for updates
      await InstallGuildCommand(guildId, command)
      return true
    }
  } catch (err) {
    console.error(err)
    return false
  }
}

async function HasGuildCommands(guildId, commands) {
  if (guildId === "") return
  const commandsInstalled = await Promise.all(
    commands.map((c) => HasGuildCommand(guildId, c))
  )
  return commandsInstalled.every((x) => x)
}

exports.handler = async function (event, context) {
  console.log(event)
  const guildId = event.queryStringParameters.guild
  const type = event.queryStringParameters.type || "install"
  const commandFilter = event.queryStringParameters.filter || "current"
  const nameFilter = event.queryStringParameters.command || ""
  const filteredCommands =
    commandFilter === "current" ? COMMANDS : DELETED_COMMANDS
  const applicationCommands = nameFilter
    ? filteredCommands.filter((c) => c.name === nameFilter)
    : filteredCommands

  if (guildId === "global") {
    let responses
    if (type === "install") {
      responses = await Promise.all(
        applicationCommands.map((command) => InstallGlobalCommand(command))
      )
    } else {
      const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/commands`
      const res = await DiscordRequestCommunity(endpoint, { method: "GET" })
      const commands = await res.json()
      const commandNames = applicationCommands.map((c) => c.name)
      const commandIds = commands
        .filter((c) => commandNames.includes(c.name))
        .map((c) => c.id)
      responses = await Promise.all(
        commandIds.map((id) => DeleteGlobalCommand(id))
      )
    }
    if (responses.every((x) => x)) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "success updating global command",
        }),
      }
    } else {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "failed to update global command",
        }),
      }
    }
  }
  let responses
  if (type === "install") {
    responses = await Promise.all(
      applicationCommands.map((command) =>
        InstallGuildCommand(guildId, command)
      )
    )
  } else {
    const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/guilds/${guildId}/commands`
    const res = await DiscordRequestCommunity(endpoint, { method: "GET" })
    const commands = await res.json()
    const commandNames = applicationCommands.map((c) => c.name)
    const commandIds = commands
      .filter((c) => commandNames.includes(c.name))
      .map((c) => c.id)
    responses = await Promise.all(
      commandIds.map((id) => DeleteGuildCommand(guildId, id))
    )
  }
  if (responses.every((x) => x)) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "success updating guild command",
      }),
    }
  } else {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "failed to update guild command",
      }),
    }
  }
}
