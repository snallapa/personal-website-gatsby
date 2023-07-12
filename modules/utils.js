export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = "https://discord.com/api/v9/" + endpoint
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body)
  // Use node-fetch to make requests
  let tries = 0
  const maxTries = 5
  while (tries < maxTries) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      ...options,
    })
    if (!res.ok) {
      const data = await res.json()
      if (data["retry_after"]) {
        tries = tries + 1
        await new Promise(r => setTimeout(r, data["retry_after"] * 1000))
      } else {
        console.log(res)
        throw new Error(JSON.stringify(data))
      }
    } else {
      return res
    }
  }
}