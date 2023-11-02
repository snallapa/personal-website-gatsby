import { doc, setDoc } from "firebase/firestore"
import { DiscordRequestProd } from "../../modules/utils.js"
import { getLeague, db } from "../../modules/firebase-db.js"
import { findTeam } from "../../modules/teams.js"
import fetch from "node-fetch"

async function respond(token, content) {
  await DiscordRequestProd(
    `webhooks/${process.env.APP_ID}/${token}/messages/@original`,
    {
      method: "PATCH",
      body: {
        content: content,
      },
    }
  )
}

exports.handler = async function (event, context) {
  const { guild_id, command, member, token, commandType } = JSON.parse(
    event.body
  )
  try {
    if (commandType === "CREATE") {
      const week = command.options[0].value
      let league
      try {
        league = await getLeague(guild_id)
      } catch (e) {
        console.error(e)
        await respond(token, e.message)
        return
      }
      let category
      try {
        category = league.commands.game_channels.category
      } catch (error) {
        await respond(
          token,
          "missing configuration, run `/game_channels configure` first"
        )
        return
      }
      if (week === 22 || week > 23) {
        await respond(token, "Please enter a valid week")
        return
      }

      const exporterOn = !!league.madden_server?.leagueId
      let weeksGames = league.schedules?.reg?.[`week${week}`]
      if (
        !weeksGames?.every((g) => !(g.awayTeamId === 0 && g.homeTeamId === 0))
      ) {
        if (!exporterOn) {
          await respond(
            token,
            "This week is currently not exported! Setup snallabot exporter and I will automatically export it for you!"
          )
          return
        }
        await respond(
          token,
          "I dont have this week, give me a second to export it!"
        )
        await fetch(
          `https://nallapareddy.com/.netlify/functions/snallabot-ea-connector`,
          {
            method: "POST",
            body: JSON.stringify({
              path: "export",
              guild: guild_id,
              exporter_body: {
                week: week,
                stage: 1,
              },
            }),
          }
        )
        league = await getLeague(guild_id)
        weeksGames = league.schedules?.reg?.[`week${week}`]
      }
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
              command: `game channels ${command.name}`,
            }),
          }
        )
      }
      await respond(token, "channels created!")
    } else if (commandType === "CLEAR") {
      let league
      try {
        league = await getLeague(guild_id)
      } catch (e) {
        console.error(e)
        await respond(token, e.message)
        return
      }
      let category
      try {
        category = league.commands.game_channels.category
      } catch (error) {
        await respond(
          token,
          "missing configuration, run `/game_channels configure` first"
        )
      }
      const res = await DiscordRequestProd(`guilds/${guild_id}/channels`, {
        method: "GET",
      })
      const channels = await res.json()
      const gameChannels = channels.filter((c) => {
        // text channel, in right category, with `vs` in it
        return (
          c.type === 0 &&
          c.parent_id &&
          c.parent_id === category &&
          c.name.includes("vs")
        )
      })
      const gameChannelIds = gameChannels.map((c) => c.id)
      const logger = league.commands.logger || {}
      let responses
      if (logger.on) {
        const logPromises = gameChannels.map((c) =>
          fetch(
            "https://nallapareddy.com/.netlify/functions/snallabot-logger-background",
            {
              method: "POST",
              body: JSON.stringify({
                guild_id: guild_id,
                logType: "CHANNEL",
                channelId: c.id,
                additionalMessages: [
                  {
                    content: `game channels ${command.name}`,
                    user: member.user.id,
                  },
                ],
              }),
            }
          )
        )
        responses = await Promise.all(logPromises)
      } else {
        const deletePromises = gameChannelIds.map((id) =>
          DiscordRequestProd(`/channels/${id}`, { method: "DELETE" })
        )
        responses = await Promise.all(deletePromises)
      }
      const exporterOn = !!league.madden_server?.leagueId
      if (exporterOn) {
        await fetch(
          `https://nallapareddy.com/.netlify/functions/snallabot-ea-connector`,
          {
            method: "POST",
            body: JSON.stringify({
              path: "export",
              guild: guild_id,
              exporter_body: {
                week: 102,
                stage: -1,
              },
            }),
          }
        )
      }
      const success = responses.every((r) => r.ok)
      await (success
        ? respond(token, "channels deleted!")
        : respond(token, "something went wrong..."))
    }
  } catch (e) {
    console.error(e)
    await respond(token, "hmm something went wrong. contact The Creator")
  }
}
