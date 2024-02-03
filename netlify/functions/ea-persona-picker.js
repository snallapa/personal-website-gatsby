import fetch from "node-fetch"

const SYSTEM_MAP = (a) => ({
  xone: `MADDEN_${a}_XONE_BLZ_SERVER`,
  ps4: `MADDEN_${a}_PS4_BLZ_SERVER`,
  pc: `MADDEN_${a}_PC_BLZ_SERVER`,
  ps5: `MADDEN_${a}_PS5_BLZ_SERVER`,
  xbsx: `MADDEN_${a}_XBSX_BLZ_SERVER`,
  stadia: `MADDEN_${a}_SDA_BLZ_SERVER`,
})

const VALID_ENTITLEMENTS = (a) => ({
  xone: `MADDEN_${a}XONE`,
  ps4: `MADDEN_${a}PS4`,
  pc: `MADDEN_${a}PC`,
  ps5: `MADDEN_${a}PS5`,
  xbsx: `MADDEN_${a}XBSX`,
  stadia: `MADDEN_${a}SDA`,
})

const namespaces = {
  xbox: "XBOX",
  ps3: "PSN",
  cem_ea_id: "EA Account",
  stadia: "Stadia",
}

const TWO_DIGIT_YEAR = "24"
const YEAR = "2024"

exports.handler = async function (event, context) {
  const body = JSON.parse(event.body)
  const code = body.code
  console.log(code)
  const res1 = await fetch(`https://accounts.ea.com/connect/token`, {
    method: "POST",
    headers: {
      "Accept-Charset": "UTF-8",
      "User-Agent":
        "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept-Encoding": "gzip",
    },
    body: `authentication_source=317239&client_secret=U02zL2khwlgFdODLWCyLPmccOc5EiPBBYcEwCqKDTWBrZj2Fwcx4b4Zd9rsA6lHLkIU4qlVvNh84olij&grant_type=authorization_code&code=${code}&redirect_uri=http://127.0.0.1/success&release_type=prod&client_id=MaddenCompanionApp19`,
  })
  const res1Json = await res1.json()
  const access_token = res1Json["access_token"]
  const refresh_token = res1Json["refresh_token"]
  const expiresIn = res1Json["expires_in"]

  console.log(res1Json)

  const res2 = await fetch(
    `https://accounts.ea.com/connect/tokeninfo?access_token=${access_token}`,
    {
      headers: {
        "Accept-Charset": "UTF-8",
        "X-Include-Deviceid": "true",
        "User-Agent":
          "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
        "Accept-Encoding": "gzip",
      },
    }
  )
  const res2Json = await res2.json()
  const pid = res2Json["pid_id"]

  console.log(res2Json)

  const res3 = await fetch(
    `https://gateway.ea.com/proxy/identity/pids/${pid}/entitlements/?status=ACTIVE`,
    {
      headers: {
        "User-Agent":
          "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
        "Accept-Charset": "UFT-8",
        "X-Expand-Results": "true",
        "Accept-Encoding": "gzip",
        Authorization: `Bearer ${access_token}`,
      },
    }
  )
  const res3Json = await res3.json()

  console.log(
    res3Json["entitlements"]["entitlement"].filter(
      (p) =>
        p.entitlementTag === "ONLINE_ACCESS" &&
        Object.values(VALID_ENTITLEMENTS(TWO_DIGIT_YEAR)).includes(p.groupName)
    )
  )

  const { pidUri, groupName: gameConsole } = res3Json["entitlements"][
    "entitlement"
  ].filter(
    (p) =>
      p.entitlementTag === "ONLINE_ACCESS" &&
      Object.values(VALID_ENTITLEMENTS(TWO_DIGIT_YEAR)).includes(p.groupName)
  )[0]

  const res4 = await fetch(
    `https://gateway.ea.com/proxy/identity${pidUri}/personas?status=ACTIVE&access_token=${access_token}`,
    {
      headers: {
        "Acccept-Charset": "UTF-8",
        "X-Expand-Results": "true",
        "User-Agent":
          "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
        "Accept-Encoding": "gzip",
      },
    }
  )
  const res4Json = await res4.json()
  res4Json.accessToken = access_token
  res4Json.gameConsole = gameConsole
  return {
    statusCode: 200,
    body: JSON.stringify(res4Json),
  }

  /*
  const system = res4Json["entitlements"]["entitlement"].filter(
    (ent) =>
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
    .then((res5) => {
      return res5.headers.get("Location")
    })
    .catch(console.warn)

  console.log(locationUrl)
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

  const locationUrl2 = await fetch(
    `https://accounts.ea.com/connect/auth?response_type=code&redirect_uri=http://127.0.0.1/success&machineProfileKey=1d6830c75f0f5a26&release_type=prod&access_token=${access_token2}&persona_id=${personaId}&client_id=${SYSTEM_MAP[system]}`,
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
    .then((res8) => {
      return res8.headers.get("Location")
    })
    .catch(console.warn)

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

  console.log(blazeSession)*/
}
