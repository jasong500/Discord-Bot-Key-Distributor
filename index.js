const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require("fs");
const { TOKEN, botID, roles } = require('./config.js');
const { adminRoleID, roleToGiveID, testServerAdminRoleID } = roles;

let ableToSend = false;
let msgToInteract = null;
const givenKey = new Map();

// Load givenKey map from file on startup
const loadGivenKeys = () => 
{
    try 
    {
        if (fs.existsSync('GivenKeys.json')) 
        {
            const data = fs.readFileSync('GivenKeys.json', 'utf-8');
            const parsed = JSON.parse(data);
            for (const [id, keys] of Object.entries(parsed)) {
                givenKey.set(id, Array.isArray(keys) ? keys : []); // Ensure keys are arrays
            }
            console.log('Loaded given keys from file.');
        } 
        else 
        {
            console.log('GivenKeys.json does not exist. Starting with an empty key list.');
        }
    } 
    catch (err) 
    {
        console.error('Failed to load given keys:', err);
    }
};

// Save givenKey map to file
const saveGivenKeys = () => {
    const data = Object.fromEntries(givenKey);
    fs.writeFileSync('GivenKeys.json', JSON.stringify(data, null, 2));
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.login(TOKEN);

client.once('ready', () => 
{
    console.log(`Logged in as ${client.user.tag}`);
    loadGivenKeys();
});

client.on('messageCreate', async (message) => 
{
    const guild = message.guild;
    const member = guild ? await guild.members.fetch(message.author.id).catch(() => null) : null;

    if (!member) 
    {
        console.error('Message author is not a guild member.');
        return;
    }

    const hasPermission = member.roles.cache.has(adminRoleID) || member.roles.cache.has(testServerAdminRoleID);

    if (message.content.toLowerCase() === '?startkeys')
    {
        if (!hasPermission) 
        {
            await message.channel.send(`<@${message.author.id}> You do not have permission to use this command.`);
            return message.delete().catch(console.error);
        }
        message.delete().catch(console.error);

        //Create button for people to press
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
            .setCustomId('key_request_button')
            .setLabel('Request a Key')
            .setStyle(ButtonStyle.Primary)
        );

        msgToInteract = await message.channel.send(
        {
            content: `Click the button below to recieve a code for testing!`,
            components: [row],
        });

        ableToSend = true;
    } 
    else if (message.content.toLowerCase() === '?stopkeys') 
    {
        if (!hasPermission) 
        {
            await message.channel.send(`<@${message.author.id}> You do not have permission to use this command.`);
            return message.delete().catch(console.error);
        }

        message.delete().catch(console.error);
        await message.channel.send('Testing has now ended, thanks for participating!');
        ableToSend = false;
    } 
    else if (message.content.toLowerCase() === 'give me a code') 
    {
        if (!hasPermission) 
        {
            await message.author.send('You do not have permission to use this command.');
            return message.delete().catch(console.error);
        }
    
        const reader = fs.readFileSync('KeyList.txt', 'utf-8');
        const lines = reader.split('\n');
    
        if (lines.length === 0 || !lines[0].trim()) 
        {
            await message.author.send('Sorry, there are no codes left. Please contact an admin.');
            return message.delete().catch(console.error);
        }
    
        const firstLine = lines.shift();
        fs.writeFileSync('KeyList.txt', lines.join('\n'));
        fs.appendFileSync('DeactivateKeys.txt', `${firstLine}\n`); // Only the code
    
        try 
        {
            const userKeys = givenKey.get(message.author.id) || [];
            userKeys.push(firstLine); // Add the new key to the user's list
            givenKey.set(message.author.id, userKeys);
            saveGivenKeys();
    
            await message.author.send(`This is your code, DO NOT FORGET TO DEACTIVATE IT AFTERWARDS \n${firstLine}`);
        } 
        catch (err) 
        {
            console.error(`Failed to send message to ${message.author.tag}: ${err}`);
        }
    
        message.delete().catch(console.error);
    }    
});

client.on('interactionCreate', async (interaction) => 
{
    if (!interaction.isButton() || interaction.customId !== 'key_request_button') return;

    if (!ableToSend) 
    {
        await interaction.reply(
        {
            content: 'Key distribution is not currently active.',
            flags: 64,
        });
        return;
    }

    const userKeys = givenKey.get(interaction.user.id);

    if (userKeys && userKeys.length > 0) 
    {
        // User already has a key, send the existing key
        const existingKeys = userKeys.join(', ');
        await interaction.reply(
        {
            content: `These are your existing codes for testing: \n${existingKeys}`,
            flags: 64,
        });
        return;
    }

    // Check for available keys
    const reader = fs.readFileSync('KeyList.txt', 'utf-8');
    const lines = reader.split('\n');
    if (lines.length === 0 || !lines[0].trim()) 
    {
        await interaction.reply(
        {
            content: 'Sorry, there are no codes left to assign. Please contact an admin.',
            flags: 64,
        });
        return;
    }

    // Assign a new key
    const firstLine = lines.shift();
    fs.writeFileSync('KeyList.txt', lines.join('\n'));
    fs.appendFileSync('DeactivateKeys.txt', `${firstLine}\n`);

    givenKey.set(interaction.user.id, [firstLine]);
    saveGivenKeys();

    await interaction.reply(
    {
        content: `This is your code for testing! \n${firstLine}`,
        flags: 64,
    });

    //Give the person who pressed the button the tester role
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if(roleToGiveID !== "Insert Role ID To Assign Testers" && !member.roles.cache.has(roleToGiveID))
    {
        await member.roles.add(roleToGiveID);
    }
    
});