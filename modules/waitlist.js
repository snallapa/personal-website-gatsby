import { doc, setDoc } from "firebase/firestore"
import { respond, respondNoMention } from "./utils.js"
import { DiscordRequestProd } from "./utils.js"
import { getLeague, db } from "./firebase-db.js"
import fetch from "node-fetch"

function createWaitlistMessage(waitlist) {
  return (
    "__**Waitlist**__\n" +
    waitlist.map((user, idx) => `${idx + 1}: <@${user}>`).join("\n")
  )
}

function notifyWaitlist(waitlist, top) {
  return (
    "__**Open Team Availiable**__\n" +
    "You turn is here:\n" +
    waitlist
      .filter((_, idx) => idx < top)
      .map((user, idx) => `${idx + 1}: <@${user}>`)
      .join("\n")
  )
}

async function handleList(guild_id, command, member) {
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }
  const waitlist = league.commands?.waitlist ?? []
  if (waitlist.length === 0) {
    return respond("there is no one on the waitlist!")
  } else {
    return respondNoMention(createWaitlistMessage(waitlist))
  }
}

async function handleAdd(guild_id, command, member) {
  const user = command.options[0].value
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }
  const waitlist = league.commands?.waitlist ?? []
  if (command.options[1]) {
    const position = command.options[1].value
    if (position > waitlist.length) {
      return respond("invalid position, beyond the waitlist length")
    }
    waitlist.splice(position - 1, 0, user)
    league.commands.waitlist = waitlist
  } else {
    waitlist.push(user)
    league.commands.waitlist = waitlist
  }
  await setDoc(doc(db, "leagues", guild_id), league, { merge: true })
  if (waitlist.length === 0) {
    return respond("there is no one on the waitlist!")
  } else {
    return respondNoMention(createWaitlistMessage(league.commands.waitlist))
  }
}

async function handleRemove(guild_id, command, member) {
  const user = command.options[0].value
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }
  const waitlist = league.commands?.waitlist ?? []
  league.commands.waitlist = waitlist.filter((w) => w !== user)
  await setDoc(doc(db, "leagues", guild_id), league, { merge: true })
  if (waitlist.length === 0) {
    return respond("there is no one on the waitlist!")
  } else {
    return respondNoMention(createWaitlistMessage(league.commands.waitlist))
  }
}

async function handlePop(guild_id, command, member) {
  const position = command.options[0] ? command.options[0].value : 1
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }
  const waitlist = league.commands?.waitlist ?? []
  if (waitlist.length === 0) {
    return respond("waitlist is empty")
  }
  league.commands.waitlist = waitlist.filter((_, idx) => idx !== position - 1)
  await setDoc(doc(db, "leagues", guild_id), league, { merge: true })
  if (waitlist.length === 0) {
    return respond("there is no one on the waitlist!")
  } else {
    return respondNoMention(createWaitlistMessage(league.commands.waitlist))
  }
}

async function handleNotify(guild_id, command, member) {
  const top = command.options[0] ? command.options[0].value : 1
  let league
  try {
    league = await getLeague(guild_id)
  } catch (e) {
    console.error(e)
    return respond(e.message)
  }
  const waitlist = league.commands?.waitlist ?? []
  if (waitlist.length === 0) {
    return respond("waitlist is empty")
  }

  return respond(notifyWaitlist(league.commands.waitlist, top))
}

export const waitlistChannelHandler = {
  list: handleList,
  add: handleAdd,
  remove: handleRemove,
  pop: handlePop,
  notify: handleNotify,
}
