
import fetch from 'node-fetch';

const TEST_COMMAND = {
    name: 'test_community',
    description: 'Basic guild command',
    type: 1,
};

const SETUP_COMMAND = {
    name: 'setup_nfl_polls',
    description: 'setup the community for nfl game polls',
    type: 1,
};

const COMMANDS = [TEST_COMMAND, SETUP_COMMAND]

const DELETED_COMMANDS = []

async function DiscordRequest(endpoint, options) {
    // append endpoint to root API URL
    const url = 'https://discord.com/api/v9/' + endpoint;
    // Stringify payloads
    if (options.body) options.body = JSON.stringify(options.body);
    console.log(options);
    // Use node-fetch to make requests
    const res = await fetch(url, {
        headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN_COMMUNITY}`,
        'Content-Type': 'application/json; charset=UTF-8',
        },
        ...options
    });
    // console.log(`response: ${res}, and okay ${res.oka}`);
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
    const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/guilds/${guildId}/commands`;
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

async function DeleteGuildCommand(guildId, commandId) {
    // API endpoint to get and post guild commands
    const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/guilds/${guildId}/commands/${commandId}`;

    try {
        const res = await DiscordRequest(endpoint, { method: 'DELETE' });
        return res.ok;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function DeleteGlobalCommand(commandId) {
    // API endpoint to get and post guild commands
    const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/commands/${commandId}`;
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
    const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/commands`;
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
    const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/guilds/${guildId}/commands`;
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
    const nameFilter = event.queryStringParameters.command || "";
    const filteredCommands = commandFilter === "current" ? COMMANDS : DELETED_COMMANDS;
    const applicationCommands = nameFilter ? filteredCommands.filter(c => c.name === nameFilter) : filteredCommands;

    if (guildId === 'global') {
        let responses;
        if (type === "install") {
            responses = await Promise.all(applicationCommands.map(command => InstallGlobalCommand(command)));
        } else {
            const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/commands`
            const res = await DiscordRequest(endpoint, { method: 'GET' });
            const commands = await res.json();
            const commandNames = applicationCommands.map(c => c.name);
            const commandIds = commands.filter(c => commandNames.includes(c.name)).map(c => c.id);
            responses = await Promise.all(commandIds.map(id => DeleteGlobalCommand(id)));
        }
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
    let responses;
    if (type === "install") {
        responses = await Promise.all(applicationCommands.map(command => InstallGuildCommand(guildId, command)));
    } else {
        const endpoint = `applications/${process.env.APP_ID_COMMUNITY}/guilds/${guildId}/commands`
        const res = await DiscordRequest(endpoint, { method: 'GET' });
        const commands = await res.json();
        const commandNames = applicationCommands.map(c => c.name);
        const commandIds = commands.filter(c => commandNames.includes(c.name)).map(c => c.id);
        responses = await Promise.all(commandIds.map(id => DeleteGuildCommand(guildId, id)));
    }
    if (responses.every(x => x)) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
                message: "success updating guild command"
            }),
        };
    } else {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
                message: "failed to update guild command"
            }),
        };
    }

}