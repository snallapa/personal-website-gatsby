import Typography from "typography"
const typography = new Typography({
  baseFontSize: "18px",
  baseLineHeight: 1.666,
  scaleRatio: 2,
  headerFontFamily: ["Muli", "sans-serif"],
  bodyFontFamily: ["Muli"],
  headerColor: "black",
  blockMarginBottom: 0,
  googleFonts: [
    {
      name: "Muli",
      styles: [["400", "400i", "700", "700i"]],
    },
  ],
})
export default typography
