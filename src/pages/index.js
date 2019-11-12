import React from "react"
import Layout from "../components/layout"
import RecentPosts from "../components/recent-posts"
import { graphql } from "gatsby"

export default ({ data }) => (
  <Layout>
    <RecentPosts posts={data.allMarkdownRemark.edges} />
  </Layout>
)

export const query = graphql`
  query {
    allMarkdownRemark {
      edges {
        node {
          id
          frontmatter {
            title
            date(formatString: "MMMM DD, YYYY")
            subtitle
          }
          fields {
            slug
          }
        }
      }
    }
  }
`
