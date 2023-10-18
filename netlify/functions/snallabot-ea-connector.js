import fetch from "node-fetch"

exports.handler = async function (event, context) {
  console.log(event)
  const body = JSON.parse(event.body)
  const { path, exporter_body: exporterBody, guild } = body
  const res = await fetch(`https://snallabot.herokuapp.com/${guild}/${path}`, {
    method: "POST",
    body: JSON.stringify(exporterBody),
  })
  if (res.ok) {
    const resJson = await res.json()
    return {
      statusCode: res.status,
      body: JSON.stringify(resJson),
    }
  } else {
    console.log(await res.text())
    return {
      statusCode: res.status,
    }
  }
}
