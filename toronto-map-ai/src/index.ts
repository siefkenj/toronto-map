// Public entry point of the compiled module.
// A future consumer can do:  import { renderTorontoMap } from "toronto-map-ai";
export { renderTorontoMap, defaultViewAnchor } from "./render/renderMap";
export type { IndexOptions, InsetOptions, RenderOptions } from "./render/renderMap";
export { DEFAULT_INDEX, DEFAULT_INSET } from "./render/renderMap";
