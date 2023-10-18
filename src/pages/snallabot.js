import React, { useState, useEffect } from "react"
import fetch from "node-fetch"

const namespaces = {
  xbox: "XBOX",
  ps3: "PSN",
  cem_ea_id: "EA Account",
  stadia: "Stadia",
}

export default () => {
  const params = new URLSearchParams(window.location.search)
  const guild = params.get("league")
  if (!guild) {
    return (
      <div> Missing discord league, did you open this from snallabot? </div>
    )
  }

  const [state, setState] = useState({
    loginState: "INITIATE_LOGIN",
    code: "",
    personas: {},
    selectedPersona: "",
    accessToken: "",
    gameConsole: "",
    personaMaddenLeagues: [],
    selectedMaddenLeague: "",
    league: {},
  })

  useEffect(() => {
    fetch("http://localhost:8888/.netlify/functions/exporter-state", {
      method: "POST",
      body: JSON.stringify({
        guild_id: guild,
      }),
    })
      .then((res) => res.json())
      .then((currentState) =>
        setState({
          ...state,
          loginState: currentState.state,
          league: currentState.league,
        })
      )
  }, [])

  useEffect(() => {
    if (state.loginState === "LEAGUE_PICKER") {
      fetch("http://localhost:8888/.netlify/functions/snallabot-ea-connector", {
        method: "POST",
        body: JSON.stringify({
          path: "getleagues",
          guild: guild,
          exporter_body: {},
        }),
      })
        .then((res) => res.json())
        .then((slimmedLeagues) =>
          setState({
            ...state,
            personaMaddenLeagues: slimmedLeagues,
            selectedMaddenLeague: slimmedLeagues[0].leagueId,
          })
        )
    }
  }, [state.loginState])

  const handleChange = (e) => {
    setState({
      ...state,
      code: e.target.value,
    })
  }

  async function choosePersona(code) {
    const res = await fetch(
      "http://localhost:8888/.netlify/functions/ea-persona-picker",
      {
        method: "POST",
        body: JSON.stringify({
          code: code,
        }),
      }
    )
    const personas = await res.json()
    const personaList = personas.personas.persona
    setState({
      ...state,
      loginState: "CHOOSE_PERSONA",
      accessToken: personas.accessToken,
      gameConsole: personas.gameConsole,
      personas: personaList,
      selectedPersona: personaList[0].personaId,
    })
  }

  async function handleClick(e) {
    const parsedCode = state.code.replace("http://127.0.0.1/success?code=", "")
    await choosePersona(parsedCode)
  }

  async function selectPersona(e) {
    const res = await fetch(
      "http://localhost:8888/.netlify/functions/snallabot-ea-connector",
      {
        method: "POST",
        body: JSON.stringify({
          path: "linkea",
          guild: guild,
          exporter_body: {
            persona: state.personas.filter(
              (p) => p.personaId == state.selectedPersona //coerce on purpose oh well
            )[0],
            token: state.accessToken,
            gameConsole: state.gameConsole,
          },
        }),
      }
    )
    if (res.ok) {
      setState({
        ...state,
        loginState: "LEAGUE_PICKER",
      })
    }
  }

  async function selectLeague(e) {
    const res = await fetch(
      "http://localhost:8888/.netlify/functions/snallabot-ea-connector",
      {
        method: "POST",
        body: JSON.stringify({
          path: "selectLeague",
          guild: guild,
          exporter_body: {
            selectedLeague: state.personaMaddenLeagues.filter(
              (m) => m.leagueId == state.selectedMaddenLeague
            )[0],
          },
        }),
      }
    )
    if (res.ok) {
      setState({ ...state, loginState: "LEAGUE_DASHBOARD" })
    }
  }

  switch (state.loginState) {
    case "INITIATE_LOGIN":
      return (
        <div>
          <div>
            <a
              href="https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=http://127.0.0.1/success&client_id=MaddenCompanionApp19&machineProfileKey=MCA4b35d75Vm-MCA&authentication_source=317239"
              target="_blank"
            >
              Login to EA
            </a>
            . Once you are logged in it will have an error/blank page at the
            end. That is EXPECTED AND NORMAL!!
          </div>
          <div>
            <label>
              Enter the URL of the page. It should start with 127.0.0.1:
              <input type="text" value={state.code} onChange={handleChange} />
            </label>
            <button onClick={handleClick}>Retrieve Leagues</button>
          </div>
        </div>
      )
    case "CHOOSE_PERSONA":
      const options = state.personas.map((p) => (
        <option value={p.personaId} key={p.personaId}>
          {p.displayName} - {namespaces[p.namespaceName]}
        </option>
      ))
      return (
        <div>
          <label>
            Which EA account should we use?
            <select
              value={state.selectedPersona}
              onChange={(e) =>
                setState({ ...state, selectedPersona: e.target.value })
              }
            >
              {options}
            </select>
          </label>
          <button onClick={selectPersona}>Submit</button>
        </div>
      )
    case "LEAGUE_PICKER":
      const leagueOptions = state.personaMaddenLeagues.map((m) => (
        <option value={m.leagueId} key={m.leagueId}>
          {m.leagueName} - {m.userTeamName}
        </option>
      ))
      return (
        <div>
          <label>
            Which league are we linking?
            <select
              value={state.selectedMaddenLeague}
              onChange={(e) =>
                setState({ ...state, selectedMaddenLeague: e.target.value })
              }
            >
              {leagueOptions}
            </select>
          </label>
          <button onClick={selectLeague}>Submit</button>
        </div>
      )
    case "LEAGUE_DASHBOARD":
      return <div> league dashboard </div>
    default:
      return <div> LOADING </div>
  }
}
