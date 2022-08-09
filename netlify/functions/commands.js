
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
        name: 'schedules',
        description: 'Upload your schedules json from madden exporter',
        required: true
    }, 
    {
        type: 11,
        name: 'teams',
        description: 'Upload your teams json from madden exporter',
        required: true
    }
],
    type: 1
};

const MADDEN_EXPORTER_COMMAND = {
    name: 'league_export',
    description: 'retrieve the Madden Companion App exporter url',
    type: 1
};

const MADDEN_CHANNELS_CREATE_COMMAND = {
    name: 'create_game_channels',
    description: 'Create game channels for the current week',
    options: [{
        type: 4, // integer
        name: 'week',
        description: 'The week number to create for',
        required: true
    },
    {
        type: 7, // channel
        name: 'category',
        description: 'category to create channels under',
        required: true,
        channel_types: [4]
    }
    ],
    type: 1,
};

const MADDEN_CHANNELS_CLEAR_COMMAND = {
    name: 'clear_game_channels',
    description: 'clear all game channels',
    options: [
    {
        type: 7, // channel
        name: 'category',
        description: 'category to create channels under',
        required: true,
        channel_types: [4]
    }
    ],
    type: 1,
};



const MADDEN_CHANNELS_COMMANDS = {
    name: 'game_channels',
    description: 'game channels: create, clear, configure',
    options: [{
        type: 1, // sub command
        name: 'create',
        description: 'create game channels',
        options: [
            {
                type: 4, // integer
                name: 'week',
                description: 'the week number to create for',
                required: true
            }
        ]
    },
    {
        type: 1, // sub command
        name: 'clear',
        description: 'clear all game channels, ignoring FW'
    },
    {
        type: 1, // sub command
        name: 'notify',
        description: 'notifies current participants, specify a game channel to notify one. otherwise notifies all of them',
        options: [
            {
                type: 7, // channel
                name: 'channel',
                description: 'game channel to notify',
                required: false,
                channel_types: [0]
            }
        ]
    },
    {
        type: 1, // sub command
        name: 'configure',
        description: 'set category',
        options: [
            {
                type: 7, // channel
                name: 'category',
                description: 'category to create channels under',
                required: true,
                channel_types: [4]
            }
        ]
    }
    ],
    type: 1,
};


const MADDEN_TEAMS_COMMANDS = {
    name: 'teams',
    description: 'teams: assign, free, configure',
    options: [{
        type: 1, // sub command
        name: 'assign',
        description: 'assign a user to a team',
        options: [
            {
                type: 3, // string
                name: 'team',
                description: 'the team city, name, or abbreviation. Ex: Buccaneers, TB, Tampa Bay',
                required: true
            },
            {
                type: 6, // string
                name: 'user',
                description: 'user',
                required: true
            }
        ]
    },
    {
        type: 1, // sub command
        name: 'open',
        description: 'open a team',
        options: [
            {
                type: 3, // string
                name: 'team',
                description: 'the team city, name, or abbreviation. Ex: Buccaneers, TB, Tampa Bay',
                required: true
            }
        ]
    },
    {
        type: 1, // sub command
        name: 'configure',
        description: 'set channel',
        options: [
            {
                type: 7, // channel
                name: 'channel',
                description: 'channel to send message in',
                required: true,
                channel_types: [0]
            }
        ]
    }
    ],
    type: 1,
};

const COMMANDS = [TEST_COMMAND,
    MADDEN_LEAGUE_COMMAND,
    MADDEN_EXPORTER_COMMAND,
    MADDEN_CHANNELS_COMMANDS,
    MADDEN_TEAMS_COMMANDS
]

const DELETED_COMMANDS = [MADDEN_CHANNELS_CREATE_COMMAND, MADDEN_CHANNELS_CLEAR_COMMAND]

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

async function DeleteGuildCommand(guildId, command) {
    // API endpoint to get and post guild commands
    const endpoint = `applications/${process.env.APP_ID}/guilds/${guildId}/commands`;
    console.log(command);
    // install command
    try {
        await DiscordRequest(endpoint, { method: 'DELETE' });
    } catch (err) {
        console.error(err);
    }
}

async function DeleteGlobalCommand(command) {
    // API endpoint to get and post guild commands
    const endpoint = `applications/${process.env.APP_ID}/commands`;
    console.log(command);
    // install command
    try {
        const res = await DiscordRequest(endpoint, { method: 'DELETE' });
        return res.ok;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function InstallGlobalCommand(command) {
    // API endpoint to get and post guild commands
    const endpoint = `applications/${process.env.APP_ID}/commands`;
    console.log(command);
    // install command
    try {
        const res = await DiscordRequest(endpoint, { method: 'POST', body: command });
        return res.ok;
    } catch (err) {
        console.error(err);
        return false;
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
            await InstallGuildCommand(guildId, command);
            return true;
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
    console.log(event);
    const guildId = event.queryStringParameters.guild;
    const type = event.queryStringParameters.type || "install";
    const commandFilter = event.queryStringParameters.filter || "current";
    const applicationCommands = commandFilter === "current" ? COMMANDS : DELETED_COMMANDS;

    if (guildId === 'global') {
        const responses = await Promise.all(applicationCommands.map(command => {
            if (type === "install") {
                return InstallGlobalCommand(command);
            } else if (type === "delete") {
                return DeleteGlobalCommand(command);
            } else {
                throw new Error("invalid type. valid types: install, delete");
            }
        }));
        if (responses.every(x => x)) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    message: "success updating global command"
                }),
            };
        } else {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    message: "failed to update global command"
                }),
            };
        }
    }
    const responses = await Promise.all(applicationCommands.map(c => {
        if (type === "install") {
            return InstallGuildCommand(guildId, c);
        } else if (type === "delete") {
            return DeleteGuildCommand(guildId, c);
        } else {
            throw new Error()
        }
    }));
    if (responses.every(x => x)) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
                message: "success updating global command"
            }),
        };
    } else {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
                message: "failed to update global command"
            }),
        };
    }

}