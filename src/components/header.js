import React from "react"
import links from "./links"
import { Link } from "gatsby"
import styles from "./header.module.css"
export default () => (
  <div className={styles.header}>
    <h1 className={styles.name}>
      <Link className={styles.home} to="/">
        Sahith Nallapareddy
      </Link>
    </h1>
    <div>
      {links.map((link, idx) => {
        return (
          <a key={idx} className={styles.nav} href={`${link.name}`}>
            {link.name}
          </a>
        )
      })}
    </div>
  </div>
)
