import React, { useState, useEffect } from "react"
import fetch from "node-fetch"
import * as styles from "./snallabot.module.css"

const namespaces = {
    xbox: "XBOX",
    ps3: "PSN",
    cem_ea_id: "EA Account",
    stadia: "Stadia",
}

const exportWeeks = {
    "Current Week": {
        stage: -1,
        week: 101,
    },
    "Preseason Week 1": {
        stage: 0,
        week: 1,
    },
    "Preseason Week 2": {
        stage: 0,
        week: 2,
    },
    "Preseason Week 3": {
        stage: 0,
        week: 3,
    },
    "Preseason Week 4": {
        stage: 0,
        week: 4,
    },
    "Regular Season Week 1": {
        stage: 1,
        week: 1,
    },
    "Regular Season Week 2": {
        stage: 1,
        week: 2,
    },
    "Regular Season Week 3": {
        stage: 1,
        week: 3,
    },
    "Regular Season Week 4": {
        stage: 1,
        week: 4,
    },
    "Regular Season Week 5": {
        stage: 1,
        week: 5,
    },
    "Regular Season Week 6": {
        stage: 1,
        week: 6,
    },
    "Regular Season Week 7": {
        stage: 1,
        week: 7,
    },
    "Regular Season Week 8": {
        stage: 1,
        week: 8,
    },
    "Regular Season Week 9": {
        stage: 1,
        week: 9,
    },
    "Regular Season Week 10": {
        stage: 1,
        week: 10,
    },
    "Regular Season Week 11": {
        stage: 1,
        week: 11,
    },
    "Regular Season Week 12": {
        stage: 1,
        week: 12,
    },
    "Regular Season Week 13": {
        stage: 1,
        week: 13,
    },
    "Regular Season Week 14": {
        stage: 1,
        week: 14,
    },
    "Regular Season Week 15": {
        stage: 1,
        week: 15,
    },
    "Regular Season Week 16": {
        stage: 1,
        week: 16,
    },
    "Regular Season Week 17": {
        stage: 1,
        week: 17,
    },
    "Regular Season Week 18": {
        stage: 1,
        week: 18,
    },
    "Wildcard Round": {
        stage: 1,
        week: 19,
    },
    "Divisional Round": {
        stage: 1,
        week: 20,
    },

    "Conference Championship Round": {
        stage: 1,
        week: 21,
    },
    Superbowl: {
        stage: 1,
        week: 23,
    },
    "All Weeks": {
        stage: -1,
        week: 100,
    },
}

function Snallabot() {
    // when building for deployment, it will build the website but only for server side rendering (SSR). Window is not availaible then
    const isSSR = typeof window === "undefined" || !window.location
    const params = new URLSearchParams(!isSSR ? window.location.search : "")
    const origin = !isSSR ? window.location.origin : ""
    const guild = params.get("league")

    const [state, setState] = useState({
        loginState: "LOADING",
        code: "",
        personas: {},
        selectedPersona: "",
        accessToken: "",
        gameConsole: "",
        personaMaddenLeagues: undefined,
        selectedMaddenLeague: "",
        league: {},
        exportOption: "Current Week",
    })

    useEffect(() => {
        if (!isSSR && guild) {
            fetch(`${origin}/.netlify/functions/exporter-state`, {
                method: "POST",
                body: JSON.stringify({
                    guild_id: guild,
                }),
            })
                .then((res) => res.json())
                .then((currentState) =>
                    setState((s) => ({
                        ...s,
                        loginState: currentState.state,
                        league: currentState.league,
                    }))
                )
                .catch((e) => setState((s) => ({ ...s, loginState: "ERROR" })))
        }
    }, [guild, isSSR, guild])

    useEffect(() => {
        if (!isSSR && guild) {
            if (state.loginState === "LEAGUE_PICKER") {
                fetch(`${origin}/.netlify/functions/snallabot-ea-connector`, {
                    method: "POST",
                    body: JSON.stringify({
                        path: "getleagues",
                        guild: guild,
                        exporter_body: {},
                    }),
                })
                    .then((res) => res.json())
                    .then((slimmedLeagues) =>
                        setState((s) => ({
                            ...s,
                            personaMaddenLeagues: slimmedLeagues ?? [],
                            selectedMaddenLeague: slimmedLeagues?.[0]?.leagueId,
                        }))
                    )
                    .catch((e) => setState((s) => ({ ...s, loginState: "ERROR" })))
            }
            if (state.loginState === "LEAGUE_DASHBOARD") {
                fetch(`${origin}/.netlify/functions/snallabot-ea-connector`, {
                    method: "POST",
                    body: JSON.stringify({
                        path: "getLeagueInfo",
                        guild: guild,
                        exporter_body: {},
                    }),
                })
                    .then((res) => res.json())
                    .then((leagueInfo) =>
                        setState((s) => ({
                            ...s,
                            leagueInfo,
                            exports: leagueInfo.exports,
                        }))
                    )
                    .catch((e) => setState((s) => ({ ...s, loginState: "ERROR" })))
            }
        }
    }, [state.loginState, guild, isSSR])

    if (isSSR) {
        return <div>SSR?</div>
    }

    if (!guild) {
        return (
            <div> Missing discord league, did you open this from snallabot? </div>
        )
    }

    const handleChange = (e) => {
        setState({
            ...state,
            code: e.target.value,
        })
    }

    async function choosePersona(code) {
        try {
            setState((s) => ({ ...s, loginState: "LOADING" }))
            const res = await fetch(
                `${origin}/.netlify/functions/ea-persona-picker`,
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
                personas: personaList,
                selectedPersona: `${personaList[0].personaId}|${personaList[0].gameConsole}`,
            })
        } catch (e) {
            setState((s) => ({ ...s, loginState: "ERROR" }))
        }
    }

    async function handleClick(e) {
        const searchParams = state.code.substring(state.code.indexOf("?"))
        const eaCode = new URLSearchParams(searchParams)
        const parsedCode = eaCode.get("code")
        if (parsedCode) {
            await choosePersona(parsedCode)
        }
    }

    async function selectPersona(e) {
        setState((s) => ({ ...s, loginState: "LOADING" }))
        const selected = state.selectedPersona.split("|")
        const selectedId = selected[0]
        const selectedGameConsole = selected[1]
        const chosenPersona = state.personas.filter(
            (p) => p.personaId == selectedId && p.gameConsole == selectedGameConsole
        )[0]
        const res = await fetch(
            `${origin}/.netlify/functions/snallabot-ea-connector`,
            {
                method: "POST",
                body: JSON.stringify({
                    path: "linkea",
                    guild: guild,
                    exporter_body: {
                        persona: chosenPersona,
                        token: state.accessToken,
                        gameConsole: selectedGameConsole,
                    },
                }),
            }
        )
        if (res.ok) {
            setState({
                ...state,
                loginState: "LEAGUE_PICKER",
            })
        } else {
            setState({ ...state, loginState: "ERROR" })
        }
    }

    async function selectLeague(e) {
        setState((s) => ({ ...s, loginState: "LOADING" }))
        const res = await fetch(
            `${origin}/.netlify/functions/snallabot-ea-connector`,
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
        } else {
            setState({ ...state, loginState: "ERROR" })
        }
    }

    async function unlinkLeague(e) {
        setState((s) => ({ ...s, loginState: "LOADING" }))
        const res = await fetch(
            `${origin}/.netlify/functions/snallabot-ea-connector`,
            {
                method: "POST",
                body: JSON.stringify({
                    path: "unlink",
                    guild: guild,
                    exporter_body: {},
                }),
            }
        )
        if (res.ok) {
            setState({
                loginState: "INITIATE_LOGIN",
                code: "",
                personas: {},
                selectedPersona: "",
                accessToken: "",
                gameConsole: "",
                personaMaddenLeagues: undefined,
                selectedMaddenLeague: "",
                league: {},
            })
        }
    }

    async function onExportChanged(newExports) {
        const res = await fetch(
            `${origin}/.netlify/functions/snallabot-ea-connector`,
            {
                method: "POST",
                body: JSON.stringify({
                    path: "updateExports",
                    guild: guild,
                    exporter_body: {
                        exports: newExports,
                    },
                }),
            }
        )
        if (res.ok) {
            const savedExports = await res.json()
            setState((s) => ({ ...s, exports: savedExports }))
        } else {
            console.error("failed to update!")
            const oldExports = state.exports.filter((e) => !e.inEdit)
            setState((s) => ({ ...s, exports: oldExports }))
        }
    }

    async function onExport(_) {
        setState((s) => ({ ...s, exportedStatus: "FETCHING" }))
        const exportKey = state.exportOption
        const exportWeek = exportWeeks[exportKey]
        const res = await fetch(
            `${origin}/.netlify/functions/snallabot-ea-connector`,
            {
                method: "POST",
                body: JSON.stringify({
                    path: "export",
                    guild: guild,
                    exporter_body: {
                        ...exportWeek,
                    },
                }),
            }
        )
        if (res.ok) {
            setState((s) => ({ ...s, exportedStatus: "SUCCESS" }))
        } else {
            if (exportKey === "All Weeks") {
                setState((s) => ({ ...s, exportedStatus: "IN_PROGRESS" }))
            } else {
                setState((s) => ({ ...s, exportedStatus: "FAILURE" }))
            }
        }
    }

    function addExport(e) {
        setState((s) => ({
            ...s,
            exports: s.exports.concat([
                {
                    url: "",
                    leagueInfo: false,
                    weeklyStats: false,
                    rosters: false,
                    autoUpdate: false,
                    inEdit: true,
                },
            ]),
        }))
    }

    switch (state.loginState) {
        case "LOADING":
            return <div> Fetching... </div>
        case "INITIATE_LOGIN":
            return (
                <div className={styles.dashboard}>
                    <div>
                        Please read all these instructions before doing anything! This
                        connects snallabot to EA and your madden league. To be clear,{" "}
                        <strong>
                            snallabot does not save your credentials, EA credentials, or any
                            console credentials (such as PSN, Xbox, etc)
                        </strong>
                        . It uses special tokens to retain its connection to EA and is
                        completely safe and secure with your personal information! This is a{" "}
                        <strong>one time setup</strong> for your league, you should not have
                        to login again
                        <br />
                        <br /> You will soon login to EA, this login is the same login you
                        would normally use for the Madden Companion App, therefore login the
                        same way you would in that app. If you are not sure, usually
                        choosing the console you are logging into will find your league
                        properly. <br />
                        <br /> Once you login to EA, you will be met with an error/blank
                        page and your browser will be at url "http://127.0.0.1". this is{" "}
                        <strong>EXPECTED AND NORMAL</strong>. Copy that entire URL into the
                        box below and you will move on to the next step! <br />
                        <br />
                        Legality wise this all falls under <strong>interoperability</strong>
                        <br />
                        <br />
                        <a
                            href="https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=http://127.0.0.1/success&client_id=MCA_25_COMP_APP&machineProfileKey=444d362e8e067fe2&authentication_source=317239"
                            target="_blank"
                        >
                            Login to EA
                        </a>
                    </div>
                    <div>
                        <label>
                            Enter the URL of the page. It should start with 127.0.0.1:
                            <input type="text" value={state.code} onChange={handleChange} />
                        </label>
                        <button type="button" className="btn btn-primary" onClick={handleClick}>
                            Login to EA
                        </button>
                    </div>
                </div>
            )
        case "CHOOSE_PERSONA":
            const options = state.personas.map((p) => (
                <option
                    value={`${p.personaId}|${p.gameConsole}`}
                    key={`${p.personaId}|${p.gameConsole}`}
                >
                    {p.displayName} - {namespaces[p.namespaceName]} - {p.gameConsole}
                </option>
            ))
            return (
                <div class="container">
                    <div class="col">
                        <br />
                        <h2>
                            Which EA account should we use?
                        </h2>

                        <div class="input-group mt-3">
                            <select class="form-select"
                                value={state.selectedPersona}
                                onChange={(e) =>
                                    setState({ ...state, selectedPersona: e.target.value })
                                }
                            >
                                {options}
                            </select>

                            <button type="button" className="btn btn-primary" onClick={selectPersona}>
                                Submit EA Account
                            </button>
                        </div>
                    </div>
                </div>
            )
        case "LEAGUE_PICKER":
            if (!state.personaMaddenLeagues) {
                return (
                    <div>
                        <div>
                            Finding all your leagues... Please be patient, EA can be slow
                        </div>
                    </div>
                )
            }
            const leagueOptions = state.personaMaddenLeagues.map((m) => (
                <option value={m.leagueId} key={m.leagueId}>
                    {m.leagueName} - {m.userTeamName}
                </option>
            ))
            if (leagueOptions.length === 0) {
                return (
                    <div>
                        <div>No Madden Leagues found for this account</div>
                        <button type="button" className="btn btn-warning" onClick={unlinkLeague}>
                            Unlink
                        </button>
                    </div>
                )
            }
            return (
                <div class="container">
                    <div class="col-lg-8">
                        <br />
                        <h2>
                            Which league are we linking?
                        </h2>

                        <div class="input-group mt-3">
                            <select class="form-select" value={state.selectedMaddenLeague} onChange={(e) => setState({ ...state, selectedMaddenLeague: e.target.value })} >
                                {leagueOptions}
                            </select>
                            <button type="button" className="btn btn-primary" onClick={selectLeague}>
                                Submit League
                            </button>
                            <button type="button" className="btn btn-warning" onClick={unlinkLeague}>
                                Unlink
                            </button>
                        </div>
                    </div>
                    <div class="col-lg-4">

                    </div>
                </div>
            )
        case "LEAGUE_DASHBOARD":
            if (!state.leagueInfo) {
                return (
                    <div>
                        Fetching League Data... Sometimes EA is slow and this takes a minute
                    </div>
                )
            }
            const {
                leagueInfo: { gameScheduleHubInfo, teamIdInfoList, seasonInfo },
                exports,
            } = state
            const rows = gameScheduleHubInfo.leagueSchedule.map((seasonGame) => {
                const game = seasonGame.seasonGameInfo
                return (
                    <tr key={seasonGame.seasonGameKey}>
                        <td>
                            {`${game.isAwayHuman ? game.awayUserName : "CPU"} ${game.awayCityName
                                } ${game.awayName} (${game.awayWin} - ${game.awayLoss}${game.awayTie > 0 ? " - " + game.awayTie : ""
                                }) at ${game.isHomeHuman ? game.homeUserName : "CPU"} ${game.homeCityName
                                } ${game.homeName} (${game.homeWin} - ${game.homeLoss}${game.homeTie > 0 ? " - " + game.homeTie : ""
                                })`}
                        </td>
                        <td>{`${game.result || "Not Played"}`}</td>
                        <td>{`${game.numberTimesPlayed || 0}`}</td>
                    </tr>
                )
            })
            const exportRows = exports.map((exportDestination, i) => {
                if (exportDestination.inEdit) {
                    return (
                        <tr key={i}>
                            <td>
                                <input
                                    value={exportDestination.url}
                                    onChange={(e) => {
                                        setState((s) => {
                                            const currentExports = [...s.exports]
                                            currentExports[i].url = e.target.value
                                            return { ...s, exports: currentExports }
                                        })
                                    }}
                                />
                            </td>
                            <td className={styles.exportboxes}>
                                <input
                                    type="checkbox"
                                    checked={exportDestination.leagueInfo}
                                    onChange={(e) => {
                                        setState((s) => {
                                            const currentExports = [...s.exports]
                                            currentExports[i].leagueInfo =
                                                !currentExports[i].leagueInfo
                                            return { ...s, exports: currentExports }
                                        })
                                    }}
                                ></input>
                            </td>
                            <td className={styles.exportboxes}>
                                <input
                                    type="checkbox"
                                    checked={exportDestination.weeklyStats}
                                    onChange={(e) => {
                                        setState((s) => {
                                            const currentExports = [...s.exports]
                                            currentExports[i].weeklyStats =
                                                !currentExports[i].weeklyStats
                                            return { ...s, exports: currentExports }
                                        })
                                    }}
                                ></input>
                            </td>
                            <td className={styles.exportboxes}>
                                <input
                                    type="checkbox"
                                    checked={exportDestination.rosters}
                                    onChange={(e) => {
                                        setState((s) => {
                                            const currentExports = [...s.exports]
                                            currentExports[i].rosters = !currentExports[i].rosters
                                            return { ...s, exports: currentExports }
                                        })
                                    }}
                                ></input>
                            </td>
                            <td className={styles.exportboxes}>
                                <input
                                    type="checkbox"
                                    checked={exportDestination.autoUpdate}
                                    onChange={(e) => {
                                        setState((s) => {
                                            const currentExports = [...s.exports]
                                            currentExports[i].autoUpdate =
                                                !currentExports[i].autoUpdate
                                            return { ...s, exports: currentExports }
                                        })
                                    }}
                                ></input>
                            </td>
                            <td>
                                <div className={styles.actions}>
                                    <div
                                        onClick={(e) => {
                                            onExportChanged(
                                                state.exports.map((e) => {
                                                    const { inEdit: _, ...rest } = e
                                                    return rest
                                                })
                                            )
                                        }}
                                        className={styles.actionable}
                                    >
                                        ✅
                                    </div>
                                </div>
                            </td>
                        </tr>
                    )
                }
                return (
                    <tr key={i}>
                        <td>{exportDestination.url}</td>
                        <td className={styles.exportboxes}>
                            <input
                                type="checkbox"
                                disabled={true}
                                checked={exportDestination.leagueInfo}
                            ></input>
                        </td>
                        <td className={styles.exportboxes}>
                            <input
                                type="checkbox"
                                disabled={true}
                                checked={exportDestination.weeklyStats}
                            ></input>
                        </td>
                        <td className={styles.exportboxes}>
                            <input
                                type="checkbox"
                                disabled={true}
                                checked={exportDestination.rosters}
                            ></input>
                        </td>
                        <td className={styles.exportboxes}>
                            <input
                                type="checkbox"
                                disabled={true}
                                checked={exportDestination.autoUpdate}
                            ></input>
                        </td>
                        <td>
                            <div className={styles.actions}>
                                <div
                                    onClick={(e) => {
                                        onExportChanged(state.exports.filter((e, idx) => idx !== i))
                                    }}
                                    className={styles.actionable}
                                >
                                    ❌
                                </div>
                            </div>
                        </td>
                    </tr>
                )
            })

            const seasonType = (() => {
                switch (seasonInfo.seasonWeekType) {
                    case 0:
                        return "Preseason"
                    case 1:
                        return "Regular Season"
                    case 2:
                    case 3:
                    case 5:
                    case 6:
                        return "Post Season"
                    case 8:
                        return "Off Season"
                    default:
                        return "something else"
                }
            })()
            const exportWeekOptions = Object.keys(exportWeeks).map((key) => {
                return (
                    <option key={key} value={key}>
                        {key}
                    </option>
                )
            })
            return (
                <div className={styles.dashboard} class="container">
                    <header> <h4>Snallabot Dashboard</h4> </header>

                    <div class="row">

                        <div class="col">
                            <div className={styles.header}>
                                <div>
                                    <div>
                                        {`${seasonType}, Year ${seasonInfo.calendarYear}`}
                                    </div>
                                    <div>
                                        {`Current Week: ${seasonInfo.weekTitle} ${seasonInfo.displayWeek > 0 ? seasonInfo.displayWeek : ""}`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div className={styles.exportTable}>

                                <div class="input-group">
                                    <select className={styles.weekPicker} class="form-select" value={state.exportOption} onChange={(e) => setState((s) => ({ ...s, exportOption: e.target.value }))} >
                                        {exportWeekOptions}
                                    </select>
                                    <button type="button" className="btn btn-primary" onClick={onExport}> Export </button>
                                </div>

                                {state.exportedStatus === "SUCCESS" && (
                                    <span className={styles.exportSuccess} class="badge text-bg-success">Success</span>
                                )}

                                {state.exportedStatus === "FAILURE" && (
                                    <span className={styles.exportFailed} class="badge text-bg-danger">Failed</span>
                                )}
                                {state.exportedStatus === "FETCHING" && (
                                    <spanc className={styles.exportFetching} class="badge text-bg-info">
                                        Export in progress...
                                    </spanc>
                                )}
                                {state.exportedStatus === "IN_PROGRESS" && (
                                    <div className={styles.exportSuccess}>
                                        All Weeks can take a bit, but it's in progress and should
                                        finish up soon!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div class="col mt-lg-3">
                            <button type="button" className="btn btn-danger float-end" onClick={unlinkLeague}> Unlink League </button>
                        </div>

                    </div>

                    <div class="table-responsive">
                        <table class="table table-hover table-sm caption-top">
                            <caption>List of Export Url's</caption>
                            <thead class="table-light">
                                <tr>
                                    <th>Url</th>
                                    <th className={styles.exportboxes}> League Info </th>
                                    <th className={styles.exportboxes}> Weekly Stats </th>
                                    <th className={styles.exportboxes}> Rosters </th>
                                    <th className={styles.exportboxes}> Auto Update </th>
                                    <th className={styles.exportboxes}>
                                        <button type="button" className="btn btn-success" onClick={addExport} >
                                            Add Export Url
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>{exportRows}</tbody>
                        </table>
                    </div>

                    <div class="table-responsive">
                        <table className={styles.gamesTable} class="table table-hover table-condensed caption-top">
                            <caption>Schedule for {` ${seasonInfo.weekTitle} ${seasonInfo.displayWeek > 0 ? seasonInfo.displayWeek : ""}`}</caption>
                            <thead class="table-light">
                                <tr>
                                    <th>Game</th>
                                    <th>Result</th>
                                    <th>Number of Times Played</th>
                                </tr>
                            </thead>
                            <tbody>{rows}</tbody>
                        </table>
                    </div>
                </div>
            )
        default:
            return (
                <div>
                    hmm something went wrong.
                    <button type="button" className="btn btn-warning" onClick={unlinkLeague}>
                        Unlink League
                    </button>
                </div>
            )
    }
}

export default () => {
    return (
        <div>
            {/* Bootstrap CDN's */}
            <link
                rel="stylesheet"
                href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
                integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
                crossOrigin="anonymous">
            </link>

            <link
                rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootswatch/5.3.3/sandstone/bootstrap.min.css"
                crossorigin="anonymous"
                referrerpolicy="no-referrer">
            </link>

            <script
                src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js"
                integrity="sha384-0pUGZvbkm6XF6gxjEnlmuGrJXVbNuzT9qBBavbLwCsOGabYfZo0T0to5eqruptLy"
                crossOrigin="anonymous">
            </script>

            {Snallabot()}
        </div>
    )
}