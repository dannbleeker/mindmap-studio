// @mind-elixir/node-menu ships no type declarations; describe its default export
// (a mind-elixir plugin installed via `me.install(nodeMenu)`).
declare module "@mind-elixir/node-menu" {
  import type { MindElixirInstance } from "mind-elixir";
  const nodeMenu: (instance: MindElixirInstance) => void;
  export default nodeMenu;
}
