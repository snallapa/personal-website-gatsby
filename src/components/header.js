import React from "react"
import links from "./links"
import { Link } from "gatsby"
export default () => (
  <div className="header">
    <h1>
      <Link className="home" to="/">
        Sahith Nallapareddy
      </Link>
    </h1>
    <div className="links">
      {links.map((link, idx) => {
        return (
          <a key={idx} className="nav" href={`${link.name}`}>
            {link.name}
          </a>
        )
      })}
    </div>
  </div>
)
