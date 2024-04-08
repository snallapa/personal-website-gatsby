exports.handler = async function (event, context) {
  await fetch(
    "https://snallabot-event-sender-b869b2ccfed0.herokuapp.com/post",
    {
      method: "POST",
      body: JSON.stringify({
        key: "time",
        event_type: "5_MIN_TRIGGER",
        delivery: "EVENT_TRANSFER",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }
  )
  return {
    statusCode: 200,
  }
}
