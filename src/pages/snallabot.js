import React, { useState, useEffect } from "react"
import fetch from "node-fetch"

const namespaces = {
  xbox: "XBOX",
  ps3: "PSN",
  cem_ea_id: "EA Account",
  stadia: "Stadia",
}

export default () => {
  const [state, setState] = useState({
    loginState: "EA_LOGIN",
    code: "",
    personas: {},
    selectedPersona: "",
  })

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
      personas: personaList,
      selectedPersona: personaList[0].personaId,
    })
  }

  async function handleClick(e) {
    const parsedCode = state.code.replace("http://127.0.0.1/success?code=", "")
    await choosePersona(parsedCode)
  }

  async function selectPersona(e) {}

  switch (state.loginState) {
    case "EA_LOGIN":
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
          <div> {state.loading === "LOADING" && <h2> Loading </h2>} </div>
        </div>
      )
    case "CHOOSE_PERSONA":
      const options = state.personas.map((p) => (
        <option value={p.personaId}>
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
  }
}
