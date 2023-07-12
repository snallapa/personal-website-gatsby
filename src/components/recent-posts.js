import React from "react"
import * as styles from "./recent-posts.module.css"
import { Link } from "gatsby"

const Post = ({ title, subtitle, time, slug }) => (
  <Link to={slug} className={styles.post}>
    <div className={styles.leftSide}>
      <h1 className={styles.title}>{title}</h1>
      <div>{subtitle}</div>
    </div>
    <div>{time}</div>
  </Link>
)

export default ({ posts }) => (
  <div>
    {posts.map(post => (
      <Post
        key={post.node.id}
        title={post.node.frontmatter.title}
        time={post.node.frontmatter.date}
        subtitle={post.node.frontmatter.subtitle}
        slug={post.node.fields.slug}
      />
    ))}
  </div>
)
