

exports.handler = async function (event, context) {
  await fetch(
    "https://nallapareddy.com/.netlify/functions/dashboard-refresh-background",
    {
      method: "POST"
    }
  )
    return {
	statusCode: 200,
    };
}
