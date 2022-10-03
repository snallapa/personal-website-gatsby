import React, { useState, useEffect } from "react"

const SYSTEM_MAP = {
    'MADDEN_23XONE': 'MADDEN_23_XONE_BLZ_SERVER',
    'MADDEN_23PS4' : 'MADDEN_23_PS4_BLZ_SERVER',
    'MADDEN_23PC'  : 'MADDEN_23_PC_BLZ_SERVER',
    'MADDEN_23PS5' : 'MADDEN_23_PS5_BLZ_SERVER',
    'MADDEN_23XBSX': 'MADDEN_23_XBSX_BLZ_SERVER',
    'MADDEN_23SDA' : 'MADDEN_23_SDA_BLZ_SERVER'
}

const CONSOLE_MAP = {
    'MADDEN_23XONE': 'xone',
    'MADDEN_23PS4' : 'ps4',
    'MADDEN_23PC'  : 'pc',
    'MADDEN_23PS5' : 'ps5',
    'MADDEN_23XBSX': 'xbsx',
    'MADDEN_23SDA' : 'sda'
}

const CORS = `https://thawing-atoll-70735.herokuapp.com/`;



export default () => {
    const code = params.get("code");
    const [state, setState] = useState({
        loading: "",
        blazeSession: "",
        code: ""
    });

    const login = async () => {
        const res1 = await fetch(`${CORS}https://accounts.ea.com/connect/token`, {
            method: 'POST', 
            headers : {
                'User-Agent': 'ProtoHttp 1.3/DS 15.1.2.2.0 (Android)',
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                'Accept': 'application/json;charset=utf-8'
            },
            body: `client_secret=U02zL2khwlgFdODLWCyLPmccOc5EiPBBYcEwCqKDTWBrZj2Fwcx4b4Zd9rsA6lHLkIU4qlVvNh84olij&grant_type=authorization_code&code=${code}&redirect_uri=http://127.0.0.1/success&release_type=prod&client_id=MaddenCompanionApp19`
        });
        const res1Json = await res1.json();
        const access_token = res1Json["access_token"];

        const res2 = await fetch(`${CORS}https://accounts.ea.com/connect/tokeninfo?access_token=${access_token}`, {
            headers: {
                'User-Agent': 'ProtoHttp 1.3/DS 15.1.2.2.0 (Android)',
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/text'
            }
        });
        const res2Json = await res2.json();
        const pid = res2Json["pid_id"];

        const res3 = await fetch(`${CORS}https://gateway.ea.com/proxy/identity/pids/${pid}/personas?access_token=${access_token}&status=ACTIVE`, {
            headers: {
                'User-Agent': 'ProtoHttp 1.3/DS 15.1.2.2.0 (Android)',
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/json;charset=utf-8',
                'X-Expand-Results': 'true'
            }
        });
        const res3Json = await res3.json();

        const personaId = res3Json["personas"]["persona"].filter(p => p.showPersona === "EVERYONE")[0].personaId;

        const res4 = await fetch(`${CORS}https://gateway.ea.com/proxy/identity/pids/${pid}/entitlements?status=ACTIVE`, {
            headers: {
                'User-Agent': 'ProtoHttp 1.3/DS 15.1.2.2.0 (Android)',
                'Content-Type': 'application/json;charset=utf-8',
                'Allow-Content-Type':  'application/json',
                'Accept': 'application/json',
                'X-Expand-Results': 'true',
                'Authorization': `Bearer ${access_token}`

            }
        });
        const res4Json = await res4.json();

        const system = res4Json["entitlements"]["entitlement"].filter(ent => ent["groupName"].includes("MADDEN_23") && ent["entitlementTag"] === "ONLINE_ACCESS")[0]["groupName"];

        const res5 = await fetch(`${CORS}https://accounts.ea.com/connect/auth?response_type=code&redirect_uri=http://127.0.0.1/success&machineProfileKey=1d6830c75f0f5a26&release_type=prod&access_token=${access_token}&persona_id=${personaId}&client_id=MaddenCompanionApp19`, {
            headers: {
                'User-Agent': 'ProtoHttp 1.3/DS 15.1.2.2.0 (Android)',
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/text',
                'Access-Control-Expose-Headers': 'Location'
            }
        });

        const locationUrl = res5.headers.get('Location');
        const code2 = new URLSearchParams(locationUrl.replace("http://127.0.0.1/success", "")).get("code");

        const res6 = await fetch(`${CORS}https://accounts.ea.com/connect/token`, {
            method: 'POST', 
            headers : {
                'User-Agent': 'ProtoHttp 1.3/DS 15.1.2.2.0 (Android)',
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                'Accept': 'application/json;charset=utf-8'
            },
            body: `client_secret=U02zL2khwlgFdODLWCyLPmccOc5EiPBBYcEwCqKDTWBrZj2Fwcx4b4Zd9rsA6lHLkIU4qlVvNh84olij&grant_type=authorization_code&code=${code2}&redirect_uri=http://127.0.0.1/success&release_type=prod&client_id=MaddenCompanionApp19`
        });
        const res6Json = await res6.json();
        const access_token2 = res6Json["access_token"];


        const res7 = await fetch(`${CORS}https://accounts.ea.com/connect/tokeninfo?access_token=${access_token2}`, {
            headers: {
                'User-Agent': 'ProtoHttp 1.3/DS 15.1.2.2.0 (Android)',
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/text'
            }
        });
        const res7Json = await res7.json();
        const pidType = res7Json["pid_type"]; // related to system (PS3)

        const res8 = await fetch(`${CORS}https://accounts.ea.com/connect/auth?response_type=code&redirect_uri=http://127.0.0.1/success&machineProfileKey=1d6830c75f0f5a26&release_type=prod&access_token=${access_token2}&persona_id=${personaId}&client_id=${SYSTEM_MAP[system]}`, {
            headers: {
                'User-Agent': 'ProtoHttp 1.3/DS 15.1.2.2.0 (Android)',
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/text',
                'Access-Control-Expose-Headers': 'Location'
            }
        });

        const locationUrl2 = res8.headers.get('Location');
        const code3 = new URLSearchParams(locationUrl2.replace("http://127.0.0.1/success", "")).get("code");

        const res9 = await fetch(`${CORS}https://wal2.tools.gos.bio-iad.ea.com/wal/authentication/login`, {
            method: 'POST',
            headers: {
                'User-Agent': 'ProtoHttp 1.3/DS 15.1.2.2.0 (Android)',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-BLAZE-VOID-RESP': 'XML',
                'X-Application-Key': 'MADDEN-MCA',
                'X-BLAZE-ID': `madden-2023-${CONSOLE_MAP[system]}-mca`
            },
            body: JSON.stringify({
                'authCode': code3
            })
        });
        const res9Json = await res9.json();
        const blazeSession = res9Json['userLoginInfo']['sessionKey'];

        console.log(blazeSession);
        setState({
            ...state,
            loading: false,
            blazeSession: blazeSession
        });
    }

    const handleChange = (e) => {
        setState({
            ...state,
            code: e.target.value
        });
    }

    const handleClick = (e) => {
        setState({
            ...state,
            loading: "LOADING"
        });
        login();
    }

    return (
        <div>
            <div>Login to EA <a href="https://accounts.ea.com/connect/auth?response_type=code&hide_create=true&redirect_uri=http://127.0.0.1/success&machineProfileKey=1d6830c75f0f5a26&release_type=prod&client_id=MaddenCompanionApp19" target="_blank">here</a>. Once you are logged in it will have an error/blank page at the end. That is correct</div>
            <div>
                <label>
                    Enter the URL of the page. It should start with 127.0.0.1:
                    <input type="text" value={state.code} onChange={handleChange} />
                </label>
                <button onClick={handleClick}>Retrieve Leagues</button>
            </div>
            <div> {state.loading === "LOADING" && <h2> Loading </h2> } </div>
        </div>
        
    )

}
