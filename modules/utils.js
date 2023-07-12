import fetch from "node-fetch"
import { InteractionResponseType } from "discord-interactions"

export async function DiscordRequest(
  endpoint,
  options,
  token = process.env.DISCORD_TOKEN,
  maxTries = 5
) {
  // append endpoint to root API URL
  const url = "https://discord.com/api/v9/" + endpoint
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body)
  // Use node-fetch to make requests
  let tries = 0
  while (tries < maxTries) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      ...options,
    })
    if (!res.ok) {
      const data = await res.json()
      if (data["retry_after"]) {
        tries = tries + 1
        await new Promise((r) => setTimeout(r, data["retry_after"] * 1000))
      } else {
        console.log(res)
        throw new Error(JSON.stringify(data))
      }
    } else {
      return res
    }
  }
}

export async function DiscordRequestProd(endpoint, options, maxTries = 5) {
  return DiscordRequest(
    endpoint,
    options,
    (token = process.env.DISCORD_TOKEN),
    (maxTries = maxTries)
  )
}

export async function DiscordRequestCommunity(endpoint, options, maxTries = 5) {
  return DiscordRequest(
    endpoint,
    options,
    (token = process.env.DISCORD_TOKEN_COMMUNITY),
    (maxTries = maxTries)
  )
}

export function respond(
  message,
  statusCode = 200,
  interactionType = InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE
) {
  return {
    statusCode: statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: interactionType,
      data: {
        content: message,
      },
    }),
  }
}

export function respondNoMention(message) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: message,
        allowed_mentions: {
          parse: [],
        },
      },
    }),
  }
}
