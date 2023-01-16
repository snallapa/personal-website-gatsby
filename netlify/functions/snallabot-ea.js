import fetch from "node-fetch"

const SYSTEM_MAP = {
  MADDEN_23XONE: "MADDEN_23_XONE_BLZ_SERVER",
  MADDEN_23PS4: "MADDEN_23_PS4_BLZ_SERVER",
  MADDEN_23PC: "MADDEN_23_PC_BLZ_SERVER",
  MADDEN_23PS5: "MADDEN_23_PS5_BLZ_SERVER",
  MADDEN_23XBSX: "MADDEN_23_XBSX_BLZ_SERVER",
  MADDEN_23SDA: "MADDEN_23_SDA_BLZ_SERVER",
}

const CONSOLE_MAP = {
  MADDEN_23XONE: "xone",
  MADDEN_23PS4: "ps4",
  MADDEN_23PC: "pc",
  MADDEN_23PS5: "ps5",
  MADDEN_23XBSX: "xbsx",
  MADDEN_23SDA: "sda",
}

exports.handler = async function(event, context) {
  const body = JSON.parse(event.body)
  const code = body.code
  const res1 = await fetch(`https://accounts.ea.com/connect/token`, {
    method: "POST",
    headers: {
      "User-Agent": "ProtoHttp 1.3/DS 15.1.2.2.0 (Android)",
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      Accept: "application/json;charset=utf-8",
    },
    body: `client_secret=U02zL2khwlgFdODLWCyLPmccOc5EiPBBYcEwCqKDTWBrZj2Fwcx4b4Zd9rsA6lHLkIU4qlVvNh84olij&grant_type=authorization_code&code=${code}&redirect_uri=http://127.0.0.1/success&release_type=prod&client_id=MaddenCompanionApp19`,
  })
  const res1Json = await res1.json()
  const access_token = res1Json["access_token"]

  console.log(res1Json)

  const res2 = await fetch(
    `https://accounts.ea.com/connect/tokeninfo?access_token=${access_token}`,
    {
      headers: {
        "User-Agent": "ProtoHttp 1.3/DS 15.1.2.2.0 (Android)",
        "Content-Type": "application/json;charset=utf-8",
        Accept: "application/text",
      },
    }
  )
  const res2Json = await res2.json()
  const pid = res2Json["pid_id"]

  console.log(res2Json)

  const res3 = await fetch(
    `https://gateway.ea.com/proxy/identity/pids/${pid}/personas?access_token=${access_token}&status=ACTIVE`,
    {
      headers: {
        "User-Agent": "ProtoHttp 1.3/DS 15.1.2.2.0 (Android)",
        "Content-Type": "application/json;charset=utf-8",
        Accept: "application/json;charset=utf-8",
        "X-Expand-Results": "true",
      },
    }
  )
  const res3Json = await res3.json()

  console.log(res3Json["personas"]["persona"])

  const personaId = res3Json["personas"]["persona"].filter(
    p => p.showPersona === "EVERYONE"
  )[0].personaId

  const res4 = await fetch(
    `https://gateway.ea.com/proxy/identity/pids/${pid}/entitlements?status=ACTIVE`,
    {
      headers: {
        "User-Agent": "ProtoHttp 1.3/DS 15.1.2.2.0 (Android)",
        "Content-Type": "application/json;charset=utf-8",
        "Allow-Content-Type": "application/json",
        Accept: "application/json",
        "X-Expand-Results": "true",
        Authorization: `Bearer ${access_token}`,
      },
    }
  )
  const res4Json = await res4.json()

  const system = res4Json["entitlements"]["entitlement"].filter(
    ent =>
      ent["groupName"].includes("MADDEN_23") &&
      ent["entitlementTag"] === "ONLINE_ACCESS"
  )[0]["groupName"]

  const locationUrl = await fetch(
    `https://accounts.ea.com/connect/auth?response_type=code&redirect_uri=http://127.0.0.1/success&machineProfileKey=1d6830c75f0f5a26&release_type=prod&access_token=${access_token}&persona_id=${personaId}&client_id=MaddenCompanionApp19`,
    {
      redirect: "manual",
      headers: {
        "User-Agent": "ProtoHttp 1.3/DS 15.1.2.2.0 (Android)",
        "Content-Type": "application/json;charset=utf-8",
        Accept: "application/text",
        "Access-Control-Expose-Headers": "Location",
      },
    }
  )
    .then(res5 => {
      return res5.headers.get("Location")
    })
    .catch(console.warn)


  const code2 = new URLSearchParams(
    locationUrl.replace("http://127.0.0.1/success", "")
  ).get("code")

  const res6 = await fetch(`https://accounts.ea.com/connect/token`, {
    method: "POST",
    headers: {
      "User-Agent": "ProtoHttp 1.3/DS 15.1.2.2.0 (Android)",
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      Accept: "application/json;charset=utf-8",
    },
    body: `client_secret=U02zL2khwlgFdODLWCyLPmccOc5EiPBBYcEwCqKDTWBrZj2Fwcx4b4Zd9rsA6lHLkIU4qlVvNh84olij&grant_type=authorization_code&code=${code2}&redirect_uri=http://127.0.0.1/success&release_type=prod&client_id=MaddenCompanionApp19`,
  })
  const res6Json = await res6.json()
  const access_token2 = res6Json["access_token"]

  const res7 = await fetch(
    `https://accounts.ea.com/connect/tokeninfo?access_token=${access_token2}`,
    {
      headers: {
        "User-Agent": "ProtoHttp 1.3/DS 15.1.2.2.0 (Android)",
        "Content-Type": "application/json;charset=utf-8",
        Accept: "application/text",
      },
    }
  )
  const res7Json = await res7.json()
  const pidType = res7Json["pid_type"] // related to system (PS3)

  const res8 = await fetch(
    `https://accounts.ea.com/connect/auth?response_type=code&redirect_uri=http://127.0.0.1/success&machineProfileKey=1d6830c75f0f5a26&release_type=prod&access_token=${access_token2}&persona_id=${personaId}&client_id=${SYSTEM_MAP[system]}`,
    {
      headers: {
        "User-Agent": "ProtoHttp 1.3/DS 15.1.2.2.0 (Android)",
        "Content-Type": "application/json;charset=utf-8",
        Accept: "application/text",
        "Access-Control-Expose-Headers": "Location",
      },
    }
  )

  const locationUrl2 = res8.headers.get("Location")
  const code3 = new URLSearchParams(
    locationUrl2.replace("http://127.0.0.1/success", "")
  ).get("code")

  const res9 = await fetch(
    `https://wal2.tools.gos.bio-iad.ea.com/wal/authentication/login`,
    {
      method: "POST",
      headers: {
        "User-Agent": "ProtoHttp 1.3/DS 15.1.2.2.0 (Android)",
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-BLAZE-VOID-RESP": "XML",
        "X-Application-Key": "MADDEN-MCA",
        "X-BLAZE-ID": `madden-2023-${CONSOLE_MAP[system]}-mca`,
      },
      body: JSON.stringify({
        authCode: code3,
      }),
    }
  )
  const res9Json = await res9.json()
  const blazeSession = res9Json["userLoginInfo"]["sessionKey"]

  console.log(blazeSession)
  return {
    statusCode: 200,
    body: JSON.stringify({ blazeSession }),
  }
}
