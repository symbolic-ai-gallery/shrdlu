import { useEffect, useRef } from "react";
import type { World } from "./types";
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
type Registry = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useWorldTools(
  world: World | null,
  status: string,
  submit: (text: string) => boolean,
) {
  const current = useRef({ world, status, submit });
  current.current = { world, status, submit };
  useEffect(() => {
    const context = (document as Document & { modelContext?: Registry })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: Tool[] = [
      {
        name: "get_blocks_world",
        description:
          "Read the live SHRDLU objects, held object, and execution status.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          status: current.current.status,
          world: current.current.world,
        }),
      },
      {
        name: "start_blocks_instruction",
        description:
          "Start one English or controlled Chinese instruction in the visible SHRDLU conversation. Returns acceptance, not completion; read get_blocks_world until status is ready.",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", minLength: 1, maxLength: 600 },
          },
          required: ["text"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: (input) => {
          if (
            !input ||
            typeof input !== "object" ||
            !("text" in input) ||
            typeof input.text !== "string" ||
            !input.text.trim() ||
            input.text.length > 600
          )
            throw new Error("text must contain 1–600 characters");
          if (current.current.status !== "ready")
            throw new Error("The world is not ready for another instruction");
          return { accepted: current.current.submit(input.text) };
        },
      },
    ];
    tools.forEach((tool) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(console.warn);
      } catch (error) {
        console.warn(error);
      }
    });
    return () => lifecycle.abort();
  }, []);
}
