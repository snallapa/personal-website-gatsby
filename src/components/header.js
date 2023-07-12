import React from "react"
import { useStaticQuery, Link, graphql } from "gatsby"
import * as styles from "./header.module.css"
export default () => {
  const data = useStaticQuery(graphql`
    query {
      site {
        siteMetadata {
          links {
            link
            name
          }
        }
      }
    }
  `)
  return (
    <div className={styles.header}>
      <h1 className={styles.name}>
        <Link className={styles.home} to="/">
          Sahith Nallapareddy
        </Link>
      </h1>
      <div>
        {data.site.siteMetadata.links.map(({ name, link }, idx) => {
          return (
            <a key={idx} className={styles.nav} href={`${link}`}>
              {name}
            </a>
          )
        })}
      </div>
    </div>
  )
}
