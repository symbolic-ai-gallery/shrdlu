export type Block = {
  ID: string;
  type: string;
  color: string;
  size: string;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
};
export type World = {
  objects: Block[];
  held: string | null;
  time: number;
  facts: number;
  action: string | null;
};
export type Resources = Record<string, string>;
export type Engine = {
  submit(text: string): void;
  step(): boolean;
  snapshot(): World;
  drain(): string[];
  replaceWorld(world: World): void;
};
export type WorkerEvent =
  | { type: "ready" | "state" | "done"; world: World; messages: string[] }
  | { type: "error"; message: string };
