import fetch from "node-fetch"
import { DiscordRequest } from "../../modules/utils.js"
import { handleEvent } from "../../modules/commands-creator.js"

const TEST_COMMAND = {
  name: "test",
  description: "Basic guild command",
  type: 1,
}

const MADDEN_LEAGUE_COMMAND = {
  name: "import_league",
  description: "update the servers madden league",
  options: [
    {
      type: 11,
      name: "schedules",
      description: "Upload your schedules json from madden exporter",
      required: true,
    },
    {
      type: 11,
      name: "teams",
      description: "Upload your teams json from madden exporter",
      required: true,
    },
  ],
  type: 1,
}

const MADDEN_EXPORTER_COMMAND = {
  name: "league_export",
  description: "retrieve the Madden Companion App exporter url",
  type: 1,
}

const MADDEN_DASHBOARD_COMMAND = {
  name: "dashboard",
  description: "your snallabot dashboard link",
  type: 1,
}

const MADDEN_CHANNELS_CREATE_COMMAND = {
  name: "create_game_channels",
  description: "Create game channels for the current week",
  options: [
    {
      type: 4, // integer
      name: "week",
      description: "The week number to create for",
      required: true,
    },
    {
      type: 7, // channel
      name: "category",
      description: "category to create channels under",
      required: true,
      channel_types: [4],
    },
  ],
  type: 1,
}

const MADDEN_CHANNELS_CLEAR_COMMAND = {
  name: "clear_game_channels",
  description: "clear all game channels",
  options: [
    {
      type: 7, // channel
      name: "category",
      description: "category to create channels under",
      required: true,
      channel_types: [4],
    },
  ],
  type: 1,
}

const MADDEN_CHANNELS_COMMANDS = {
  name: "game_channels",
  description: "game channels: create, clear, configure",
  options: [
    {
      type: 1, // sub command
      name: "create",
      description: "create game channels",
      options: [
        {
          type: 4, // integer
          name: "week",
          description: "the week number to create for",
          required: true,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "clear",
      description: "clear all game channels, ignoring FW",
    },
    {
      type: 1, // sub command
      name: "notify",
      description:
        "notifies current participants, specify a game channel to notify one. otherwise notifies all of them",
      options: [
        {
          type: 7, // channel
          name: "channel",
          description: "game channel to notify",
          required: false,
          channel_types: [0],
        },
      ],
    },
    {
      type: 1, // sub command
      name: "configure",
      description: "set category",
      options: [
        {
          type: 7, // channel
          name: "category",
          description: "category to create channels under",
          required: true,
          channel_types: [4],
        },
      ],
    },
    {
      type: 1, // sub command
      name: "configure_notifier",
      description: "configures snallabot notifier",
      options: [
        {
          type: 7, // channel
          name: "fw",
          description: "channel to post force wins under",
          required: true,
          channel_types: [0],
        },
        {
          type: 4, // integer
          name: "ping",
          description: "number of hours to wait before pinging again",
          required: true,
        },
        {
          type: 8, // role
          name: "fw_admin",
          description: "admin role to confirm force wins",
          required: true,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "off_notifier",
      description: "turns off snallabot notifier",
      options: [],
    },
    {
      type: 1, // sub command
      name: "create_wildcard",
      description: "create wildcard game channels",
      options: [],
    },
    {
      type: 1, // sub command
      name: "create_divisional",
      description: "create divisional game channels",
      options: [],
    },
    {
      type: 1, // sub command
      name: "create_conference",
      description: "create conference championship game channels",
      options: [],
    },
    {
      type: 1, // sub command
      name: "create_superbowl",
      description: "create superbowl game channels",
      options: [],
    },
  ],
  type: 1,
}

const MADDEN_SCHEDULE_COMMAND = {
  name: "schedule",
  description: "Shows the schedule for that week",
  options: [
    {
      type: 4, // integer
      name: "week",
      description: "The week number to get the schedule for",
      required: true,
    },
  ],
  type: 1,
}

const MADDEN_TEAMS_COMMANDS = {
  name: "teams",
  description: "teams: assign, free, configure",
  options: [
    {
      type: 1, // sub command
      name: "assign",
      description: "assign a user to a team",
      options: [
        {
          type: 3, // string
          name: "team",
          description:
            "the team city, name, or abbreviation. Ex: Buccaneers, TB, Tampa Bay",
          required: true,
        },
        {
          type: 6, // string
          name: "user",
          description: "user",
          required: true,
        },
        {
          type: 8, // role
          name: "role",
          description: "role to track on",
          required: false,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "open",
      description: "open a team",
      options: [
        {
          type: 3, // string
          name: "team",
          description:
            "the team city, name, or abbreviation. Ex: Buccaneers, TB, Tampa Bay",
          required: true,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "configure",
      description: "sets channel",
      options: [
        {
          type: 7, // channel
          name: "channel",
          description: "channel to send message in",
          required: true,
          channel_types: [0],
        },
        {
          type: 5, // channel
          name: "auto_update",
          description: "auto assign teams based on a new role",
          required: false,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "reset",
      description: "resets all teams",
      options: [],
    },
  ],
  type: 1,
}

const MADDEN_WAITLIST_COMMANDS = {
  name: "waitlist",
  description: "waitlist: list, add, remove, pop, notify",
  options: [
    {
      type: 1, // sub command
      name: "list",
      description: "lists the current users in the waitlist",
      options: [],
    },
    {
      type: 1, // sub command
      name: "add",
      description: "adds a user to the waitlist",
      options: [
        {
          type: 6, // user
          name: "user",
          description: "user to add to the waitlist",
          required: true,
        },
        {
          type: 4, // integer
          name: "position",
          description:
            "adds this user at that waitlist position, pushing the rest back",
          required: false,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "remove",
      description: "removes a user from the waitlist ",
      options: [
        {
          type: 6, // user
          name: "user",
          description: "user to remove",
          required: true,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "pop",
      description: "removes a user by their position, default to first in line",
      options: [
        {
          type: 4, // integer
          name: "position",
          description: "position to remove, defaults to the user on the top",
          required: false,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "notify",
      description: "notify top waitlist positions that a team is open",
      options: [
        {
          type: 4, // integer
          name: "top",
          description: "the number of waitlist people to notify, defaults to 1",
          required: false,
        },
      ],
    },
  ],
  type: 1,
}

const MADDEN_STREAMS_COMMANDS = {
  name: "streams",
  description: "streams: configure, count, remove, reset",
  options: [
    {
      type: 1, // sub command
      name: "configure",
      description: "sets channel",
      options: [
        {
          type: 7, // channel
          name: "channel",
          description: "channel to send message in",
          required: true,
          channel_types: [0],
        },
      ],
    },
    {
      type: 1, // sub command
      name: "count",
      description: "ups the stream count by 1, optionally override the count",
      options: [
        {
          type: 6, // user
          name: "user",
          description: "user to count the stream for",
          required: true,
        },
        {
          type: 4, // integer
          name: "step",
          description:
            "changes the increment from 1 to your choice. can be negative",
          required: false,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "remove",
      description: "removes the user stream counts",
      options: [
        {
          type: 6, // user
          name: "user",
          description: "user to remove",
          required: true,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "reset",
      description: "DANGER resets all users to 0",
      options: [],
    },
  ],
  type: 1,
}

const MADDEN_LOGGER_COMMANDS = {
  name: "logger",
  description: "logger: configure logger for snallabot",
  options: [
    {
      type: 1, // sub command
      name: "configure",
      description: "sets channel",
      options: [
        {
          type: 7, // channel
          name: "channel",
          description: "channel to send message in",
          required: true,
          channel_types: [0],
        },
        {
          type: 5,
          name: "on",
          description: "auto assign teams based on a new role",
          required: false,
        },
      ],
    },
  ],
  type: 1,
}

const MADDEN_EXPORT_COMMAND = {
  name: "export",
  description: "export your league through the dashboard",
  options: [
    {
      type: 1, // sub command
      name: "current",
      description: "exports the current week",
      options: [],
    },
    {
      type: 1, // sub command
      name: "week",
      description: "exports the specified week",
      options: [
        {
          type: 4, // integer
          name: "week",
          description: "the week number to export",
          required: true,
        },
      ],
    },
    {
      type: 1, // sub command
      name: "all_weeks",
      description: "exports all weeks",
      options: [],
    },
  ],
  type: 1,
}

const COMMANDS = [
  TEST_COMMAND,
  MADDEN_LEAGUE_COMMAND,
  MADDEN_EXPORTER_COMMAND,
  MADDEN_CHANNELS_COMMANDS,
  MADDEN_TEAMS_COMMANDS,
  MADDEN_WAITLIST_COMMANDS,
  MADDEN_STREAMS_COMMANDS,
  MADDEN_SCHEDULE_COMMAND,
  MADDEN_LOGGER_COMMANDS,
  MADDEN_DASHBOARD_COMMAND,
  MADDEN_EXPORT_COMMAND,
]

const DELETED_COMMANDS = [
  MADDEN_CHANNELS_CREATE_COMMAND,
  MADDEN_CHANNELS_CLEAR_COMMAND,
]

exports.handler = async function (event, context) {
  const res = await handleEvent(
    event,
    context,
    COMMANDS,
    DELETED_COMMANDS,
    process.env.APP_ID,
    process.env.DISCORD_TOKEN
  )
  return res
}
