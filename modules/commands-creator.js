import { DiscordRequest } from "./utils.js"

async function InstallGuildCommand(guildId, command, app_id, discord_token) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${app_id}/guilds/${guildId}/commands`
  console.log(command)
  // install command
  try {
    const res = await DiscordRequest(
      endpoint,
      {
        method: "POST",
        body: command,
      },
      (token = discord_token)
    )
    return res.ok
  } catch (err) {
    console.error(err)
    return false
  }
}

async function DeleteGuildCommand(guildId, commandId, app_id, discord_token) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${app_id}/guilds/${guildId}/commands/${commandId}`

  try {
    const res = await DiscordRequest(
      endpoint,
      { method: "DELETE" },
      (token = discord_token)
    )
    return res.ok
  } catch (err) {
    console.error(err)
    return false
  }
}

async function DeleteGlobalCommand(commandId, app_id) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${app_id}/commands/${commandId}`
  // install command
  try {
    const res = await DiscordRequest(
      endpoint,
      { method: "DELETE" },
      (token = discord_token)
    )
    return res.ok
  } catch (err) {
    console.error(err)
    return false
  }
}

async function InstallGlobalCommand(command, app_id, discord_token) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${app_id}/commands`
  console.log(command)
  // install command
  try {
    const res = await DiscordRequest(
      endpoint,
      {
        method: "POST",
        body: command,
      },
      (token = discord_token)
    )
    return res.ok
  } catch (err) {
    console.error(err)
    return false
  }
}

export async function handleEvent(
  event,
  context,
  commands,
  deletedCommands,
  app_id,
  discord_token
) {
  console.log(event)
  const guildId = event.queryStringParameters.guild
  const type = event.queryStringParameters.type || "install"
  const commandFilter = event.queryStringParameters.filter || "current"
  const nameFilter = event.queryStringParameters.command || ""
  const filteredCommands =
    commandFilter === "current" ? commands : deletedCommands
  const applicationCommands = nameFilter
    ? filteredCommands.filter((c) => c.name === nameFilter)
    : filteredCommands

  if (guildId === "global") {
    let responses
    if (type === "install") {
      responses = await Promise.all(
        applicationCommands.map((command) =>
          InstallGlobalCommand(command, app_id, discord_token)
        )
      )
    } else {
      const endpoint = `applications/${app_id}/commands`
      const res = await DiscordRequest(
        endpoint,
        { method: "GET" },
        (token = discord_token)
      )
      const commands = await res.json()
      const commandNames = applicationCommands.map((c) => c.name)
      const commandIds = commands
        .filter((c) => commandNames.includes(c.name))
        .map((c) => c.id)
      responses = await Promise.all(
        commandIds.map((id) => DeleteGlobalCommand(id, app_id, discord_token))
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
        InstallGuildCommand(guildId, command, app_id, discord_token)
      )
    )
  } else {
    const endpoint = `applications/${process.env.APP_ID}/guilds/${guildId}/commands`
    const res = await DiscordRequest(endpoint, { method: "GET" })
    const commands = await res.json()
    const commandNames = applicationCommands.map((c) => c.name)
    const commandIds = commands
      .filter((c) => commandNames.includes(c.name))
      .map((c) => c.id)
    responses = await Promise.all(
      commandIds.map((id) =>
        DeleteGuildCommand(guildId, id, app_id, discord_token)
      )
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
