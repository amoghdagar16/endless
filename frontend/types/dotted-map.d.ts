declare module "dotted-map" {
  export interface DottedMapOptions {
    height?: number
    grid?: string
  }

  export interface DottedMapSvgOptions {
    radius?: number
    color?: string
    shape?: "circle" | "square"
    backgroundColor?: string
  }

  export default class DottedMap {
    constructor(options?: DottedMapOptions)
    getSVG(options?: DottedMapSvgOptions): string
  }
}
