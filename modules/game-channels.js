import { doc, setDoc, getDoc } from "firebase/firestore"
import { respond } from "./utils.js"
import { DiscordRequestProd } from "../../modules/utils.js"

async function handleConfigure(guild_id, db, command) {
  const category = command.options[0].value
  await setDoc(
    doc(db, "leagues", guild_id),
    {
      commands: {
        game_channels: {
          category: category,
        },
      },
    },
    { merge: true }
  )
  return respond("configured! game channels command is ready for use")
}

async function handleCreate(guild_id, db, command) {
  const week = command.options[0].value
  const docRef = doc(db, "leagues", guild_id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    return respond(
      `no league found for ${guild_id}, export in MCA using league_export first`
    )
  }
  const league = docSnap.data()
  let category
  try {
    category = league.commands.game_channels.category
  } catch (error) {
    return respond(
      "missing configuration, run `/game_channels configure` first"
    )
  }
  if (!league.schedules.reg || !league.schedules.reg[`week${week}`]) {
    return respond(
      `missing week ${week}. Please export the week in MCA (select ALL WEEKS in the app!)`
    )
  }

  if (week > 18) {
    return respond(`sorry I dont know about playoffs :(`)
  }

  const weeksGames = league.schedules.reg[`week${week}`]
  const teams = league.teams
  const channelPromises = weeksGames.map((game) => {
    return DiscordRequestProd(`guilds/${guild_id}/channels`, {
      method: "POST",
      body: {
        type: 0,
        name: `${teams[game.awayTeamId].teamName}-vs-${
          teams[game.homeTeamId].teamName
        }`,
        parent_id: category,
      },
    })
  })
  const responses = await Promise.all(channelPromises)
  const logger = league.commands.logger || {}
  if (logger.on) {
    const _ = await fetch(
      "https://nallapareddy.com/.netlify/functions/snallabot-logger-background",
      {
        method: "POST",
        body: JSON.stringify({
          guild_id: guild_id,
          logType: "COMMAND",
          user: member.user.id,
          command: `${name} ${subcommand}`,
        }),
      }
    )
  }
  if (responses.every((r) => r.ok)) {
    return respond("created!")
  } else {
    return respond("something went wrong... maybe try again or contact owner")
  }
}
