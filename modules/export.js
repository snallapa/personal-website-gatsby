import { doc, setDoc } from "firebase/firestore"
import { respond } from "./utils.js"
import { DiscordRequestProd } from "./utils.js"
import { getLeague, db } from "./firebase-db.js"
import { findTeam } from "./teams.js"
import { InteractionResponseType } from "discord-interactions"
import fetch from "node-fetch"

async function handleExport(guild_id, command, member, token) {
  await fetch(
    "https://nallapareddy.com/.netlify/functions/interaction-handler-background",
    {
      method: "POST",
      body: JSON.stringify({
        guild_id: guild_id,
        command: command,
        member: member,
        token: token,
        commandType: "EXPORT",
      }),
    }
  )

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64 },
    }),
  }
}

async function handleExportCurrent(guild_id, command, member, token) {
  command.options = [{ value: 101 }]
  return handleExport(guild_id, command, member, token)
}

async function handleExportAllWeeks(guild_id, command, member, token) {
  command.options = [{ value: 100 }]
  return handleExport(guild_id, command, member, token)
}

export const exportHandler = {
  current: handleExportCurrent,
  week: handleExport,
  all_weeks: handleExportAllWeeks,
}
