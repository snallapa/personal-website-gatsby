import {
    InteractionType,
    InteractionResponseType,
    verifyKey
  } from 'discord-interactions';

function VerifyDiscordRequest(clientKey) {
  return function (event) {
    const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];

    const isValidRequest = verifyKey(event.body, signature, timestamp, clientKey);
    return isValidRequest;
  };
}

const verifier = VerifyDiscordRequest(process.env.PUBLIC_KEY);

exports.handler = async function(event, context) {
    if (verifier(event)) {
        return {
            statusCode: 401
        }
    }
    console.log(event)
    const { type, id, data } = JSON.parse(event.body);
    if (type === InteractionType.PING) {
        return {
            statusCode: 200,
            body: JSON.stringify({ type: InteractionResponseType.PONG }),
          };
    }
    return {
        statusCode: 200,
        body: JSON.stringify({ type: "NOT PONG" }),
      };
}