import { DiscordRequestMedia } from "../../modules/utils.js"

const TEST_COMMAND = {
  name: "test_community",
  description: "Basic guild command",
  type: 1,
}

const CONFIGURE_COMMAND = {
  name: "setup_media",
  description: "setup the media channel",
  type: 1,
  options: [
    {
      type: 7, // channel
      name: "channel",
      description: "channel to create media posts in",
      required: true,
      channel_types: [0],
    },
  ],
}

const GENERATE_COMMAND = {
  name: "generate_media",
  description: "start the media generation process",
  type: 1,
  options: [],
}

const COMMANDS = [TEST_COMMAND, CONFIGURE_COMMAND, GENERATE_COMMAND]

exports.handler = async function (event, context) {
  const res = await handleEvent(
    event,
    context,
    COMMANDS,
    [],
    process.env.APP_ID_MEDIA,
    process.env.DISCORD_TOKEN_MEDIA
  )
  return res
}
