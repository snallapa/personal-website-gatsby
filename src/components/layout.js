import React from "react"
import Header from "./header"
import * as styles from "./layout.module.css"

export default ({ children }) => (
  <div>
    <Header />
    <div className={styles.content}>{children}</div>
  </div>
)
