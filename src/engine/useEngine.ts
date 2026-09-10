import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkerEvent, World } from "./types";
import { toEnglish } from "./chinese";
export type Message = {
  id: number;
  role: "user" | "assistant" | "system";
  text: string;
  translation?: string;
  time: string;
};
export function useEngine() {
  const [world, setWorld] = useState<World | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [status, setStatus] = useState<"loading" | "ready" | "busy" | "error">(
      "loading",
    );
  const worker = useRef<Worker | null>(null),
    counter = useRef(0),
    state = useRef(status),
    watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const add = useCallback(
    (role: Message["role"], text: string, translation?: string) =>
      setMessages((m) => [
        ...m,
        {
          id: ++counter.current,
          role,
          text,
          translation,
          time: new Date().toLocaleTimeString("en-GB"),
        },
      ]),
    [],
  );
  const setPhase = (value: typeof status) => {
    state.current = value;
    setStatus(value);
  };
  const reset = useCallback(() => {
    clearTimeout(watchdog.current);
    worker.current?.terminate();
    setPhase("loading");
    setMessages([]);
    setWorld(null);
    counter.current = 0;
    const w = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    watchdog.current = setTimeout(() => {
      w.terminate();
      setPhase("error");
      add("system", "引擎加载超时，请重置后重试。");
    }, 20000);
    w.onmessage = (event: MessageEvent<WorkerEvent>) => {
      const data = event.data;
      if (data.type === "error") {
        clearTimeout(watchdog.current);
        w.terminate();
        setPhase("error");
        add("system", data.message);
        return;
      }
      setWorld(data.world);
      data.messages.forEach((text) => add("assistant", text));
      if (data.type === "ready" || data.type === "done") {
        clearTimeout(watchdog.current);
        setPhase("ready");
      }
    };
    w.onerror = (event) => {
      clearTimeout(watchdog.current);
      setPhase("error");
      add("system", event.message || "Engine failed to start.");
    };
    w.postMessage({
      type: "init",
      base: new URL(import.meta.env.BASE_URL, location.origin).href,
    });
  }, [add]);
  useEffect(() => {
    reset();
    return () => {
      clearTimeout(watchdog.current);
      worker.current?.terminate();
    };
  }, [reset]);
  const submit = useCallback(
    (input: string) => {
      if (state.current !== "ready" || !input.trim()) return false;
      const translated = toEnglish(input.trim());
      add(
        "user",
        input.trim(),
        translated.translated ? translated.text : undefined,
      );
      if (translated.error) {
        add("system", translated.error);
        return true;
      }
      setPhase("busy");
      worker.current?.postMessage({ type: "submit", text: translated.text });
      watchdog.current = setTimeout(() => {
        worker.current?.terminate();
        setPhase("error");
        add("system", "本轮推理超时。请重置世界后尝试更简短的指令。");
      }, 35000);
      return true;
    },
    [add],
  );
  return { world, messages, status, submit, reset };
}
