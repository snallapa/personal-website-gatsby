import React from "react"
import MBDTF from "../svg/mbdtf.svg"
import Pikachu from "../svg/pikachu.svg"
import Flower from "../svg/flower.svg"
import WLR from "../svg/wlr.svg"

export const DesignedImage = ({ image }) => {
  switch (image) {
    case "mbdtf":
      return <MBDTF />
    case "pikachu":
      return <Pikachu />
    case "flower":
      return <Flower />
    case "wlr":
      return <WLR />
    default:
      return <Pikachu />
  }
}

export default ({ forcedImage = undefined }) => {
  const options = ["mbdtf", "pikachu", "flower", "wlr"]
  const randomImage = options[Math.floor(Math.random() * options.length)]
  return <DesignedImage image={forcedImage ? forcedImage : randomImage} />
}
