/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.org/docs/gatsby-config/
 */

module.exports = {
  siteMetadata: {
    links: [
      { name: "Github", link: "https://github.com/snallapa/" },
      { name: "Twitter", link: "https://twitter.com/snallapa" },
      { name: "LinkedIn", link: "https://www.linkedin.com/in/snallapareddy" },
      {
        name: "Resume",
        link:
          "https://drive.google.com/file/d/1K4fi7OghfSGq8BHyAkHcuZ07u-hUtK69/view?usp=sharing",
      },
    ],
  },
  plugins: [
    {
      resolve: `gatsby-plugin-typography`,
      options: {
        pathToConfigModule: `src/utils/typography`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `posts`,
        path: `${__dirname}/posts/`,
      },
    },
    `gatsby-transformer-remark`,
  ],
}
