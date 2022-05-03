
import fetch from 'node-fetch';

const TEST_COMMAND = {
    name: 'test',
    description: 'Basic guild command',
    type: 1,
};

const MADDEN_LEAGUE_COMMAND = {
    name: 'import_league',
    description: 'update the servers madden league',
    options: [{
        type: 11,
        name: 'schedules.json',
        description: 'Upload your schedules json from madden exporter',
        required: true
    }, 
    {
        type: 11,
        name: 'stats.json',
        description: 'Upload your teams json from madden exporter',
        required: true
    }
],
    type: 1
};

const MADDEN_CHANNELS_CREATE_COMMAND = {
    name: 'create_game_channels',
    description: 'Create game channels for the current week',
    options: [{
        type: 4,
        name: 'week',
        description: 'The week number to create for',
        required: true
    },
    {
        type: 7,
        name: 'category',
        description: 'category to create channels under',
        required: true,
        channel_types: [4]
    }
    ],
    type: 1,
};

async function DiscordRequest(endpoint, options) {
    // append endpoint to root API URL
    const url = 'https://discord.com/api/v9/' + endpoint;
    // Stringify payloads
    if (options.body) options.body = JSON.stringify(options.body);
    console.log(options);
    // Use node-fetch to make requests
    const res = await fetch(url, {
        headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        },
        ...options
    });
    // throw API errors
    if (!res.ok) {
        const data = await res.json();
        console.log(res.status);
        throw new Error(JSON.stringify(data));
    }
    // return original response
    return res;
}

async function InstallGuildCommand(guildId, command) {
    // API endpoint to get and post guild commands
    const endpoint = `applications/${process.env.APP_ID}/guilds/${guildId}/commands`;
    console.log(command);
    // install command
    try {
        await DiscordRequest(endpoint, { method: 'POST', body: command });
    } catch (err) {
        console.error(err);
    }
}

async function HasGuildCommand(guildId, command) {
// API endpoint to get and post guild commands
    const endpoint = `applications/${process.env.APP_ID}/guilds/${guildId}/commands`;
    try {
        const res = await DiscordRequest(endpoint, { method: 'GET' });
        const data = await res.json();
        console.log(data)

        if (data) {
            const installedNames = data.map((c) => c['name']);
            // This is just matching on the name, so it's not good for updates
            if (!installedNames.includes(command['name'])) {
                console.log(`Installing "${command['name']}"`);
                await InstallGuildCommand(guildId, command);
                return true;
            } else {
                console.log(`"${command['name']}" command already installed`);
                return true;
            }
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function HasGuildCommands(guildId, commands) {
    if (guildId === '') return;
    const commandsInstalled = await Promise.all(commands.map((c) => HasGuildCommand(guildId, c)));
    return commandsInstalled.every(x => x);
}

exports.handler = async function(event, context) {
    const guildId = event.queryStringParameters.guild;
    console.log(event);
    const hasGuild = await HasGuildCommands(guildId, [TEST_COMMAND, MADDEN_LEAGUE_COMMAND, MADDEN_CHANNELS_CREATE_COMMAND]);
    if (!hasGuild) {
        return {
            statusCode: 400
        }
    }
    return {
        statusCode: 200
    }
}