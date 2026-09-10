import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Switch } from "@base-ui/react/switch";
import {
  ArrowUpRight,
  Box,
  ChevronRight,
  Code2,
  Download,
  Globe2,
  History,
  Layers3,
  Maximize,
  MessageSquare,
  Play,
  RotateCcw,
  Send,
  Square,
  Terminal,
  X,
} from "lucide-react";
import WorldView, { blockName, colors } from "./components/WorldView";
import { useEngine } from "./engine/useEngine";
import { translateReply } from "./engine/chinese";
import classic from "./engine/classic.json";
import { useWorldTools } from "./engine/webmcp";
const prompts = [
  ["拿起一个大的红色积木块。", "Pick up a big red block."],
  ["把蓝色积木放进盒子里。", "Put the blue block in the box."],
  ["盒子里装着什么？", "What does the box contain?"],
  ["抓住那个棱锥。", "Grasp the pyramid."],
];
const tour = [
  "Pick up a big red block.",
  "Put it on the table.",
  "Put the green pyramid in the box.",
  "What does the box contain?",
  "What color is the red cube?",
  "Thank you.",
];
export default function App() {
  const { world, messages, status, submit, reset } = useEngine();
  useWorldTools(world, status, submit);
  const [zh, setZh] = useState(true),
    [input, setInput] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [wireframe, setWireframe] = useState(false),
    [labels, setLabels] = useState(false),
    [cameraKey, setCameraKey] = useState(0),
    [panel, setPanel] = useState<"objects" | "history">("objects"),
    [tourStep, setTourStep] = useState(-1),
    [classicStep, setClassicStep] = useState(0);
  const bottom = useRef<HTMLDivElement>(null),
    field = useRef<HTMLTextAreaElement>(null),
    tourTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t = (a: string, b: string) => (zh ? a : b);
  const objects =
    world?.objects.filter((b) => !["table", "arm"].includes(b.type)) ?? [];
  const active = objects.find((b) => b.ID === selected),
    ready = status === "ready";
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status]);
  useEffect(() => {
    document.documentElement.lang = zh ? "zh-CN" : "en";
  }, [zh]);
  useEffect(() => {
    if (tourStep < 0 || status !== "ready") return;
    if (tourStep >= tour.length) {
      setTourStep(-1);
      return;
    }
    tourTimer.current = setTimeout(() => {
      submit(tour[tourStep]);
      setTourStep((i) => i + 1);
    }, 1200);
    return () => clearTimeout(tourTimer.current);
  }, [tourStep, status, submit]);
  const send = () => {
    if (submit(input)) {
      setInput("");
      field.current?.focus();
    }
  };
  const restart = () => {
    setTourStep(-1);
    setClassicStep(0);
    setSelected(null);
    reset();
  };
  const download = () => {
    const text = messages
      .map(
        (m) =>
          `${m.role.toUpperCase()}: ${m.text}${m.translation ? `\n→ ${m.translation}` : ""}`,
      )
      .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "shrdlu-conversation.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="app-shell">
      <header className="header">
        <a className="brand" href="#">
          <Box size={29} />
          <span>
            SHRDLU<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="header-right">
          <a className="text-button" href="#">
            {t("背景与说明", "Background")}
          </a>
          <button
            className="text-button language"
            onClick={() => setZh(!zh)}
            aria-label={t("切换界面语言", "Switch language")}
          >
            <Globe2 size={16} />
            {zh ? "EN / 中文" : "中文 / EN"}
          </button>
        </div>
      </header>
      <main>
        <div className="workspace-heading">
          <div>
            <h1>{t("积木世界", "Blocks world")}</h1>
          </div>
          <div className="heading-actions shrink-0">
            <Dialog.Root>
              <Dialog.Trigger className="button secondary">
                <History size={16} />
                {t("原版对话", "Original transcript")}
                <span className="count">43</span>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Backdrop className="backdrop" />
                <Dialog.Popup className="modal transcript">
                  <div className="modal-head">
                    <Dialog.Title>
                      {t("原版对话记录", "Original transcript")}
                    </Dialog.Title>
                    <Dialog.Description>
                      {t(
                        "左侧为原始资料。点击箭头将该句填入输入框，发送后查看实际结果。经典对话依赖顺序和世界状态。",
                        "Historical source text. Use the arrow to fill the input, then send it to the live experiment. The conversation depends on previous turns and world state.",
                      )}
                    </Dialog.Description>
                  </div>
                  <div className="transcript-list">
                    {classic.map((line, i) => (
                      <div className="transcript-row" key={i}>
                        <span className="line-number tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p>{line.en}</p>
                          {zh && <p className="muted">{line.zh}</p>}
                          <p className="original-answer">
                            <span>1970</span>
                            {line.answer}
                          </p>
                        </div>
                        <Dialog.Close
                          disabled={!ready}
                          className="icon-button"
                          onClick={() => {
                            setInput(zh ? line.zh : line.en);
                            field.current?.focus();
                          }}
                          aria-label={`Use line ${i + 1}`}
                        >
                          <ArrowUpRight size={17} />
                        </Dialog.Close>
                      </div>
                    ))}
                  </div>
                  <Dialog.Close
                    className="icon-button modal-close"
                    aria-label="Close"
                  >
                    <X />
                  </Dialog.Close>
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
            <button
              className={`button primary ${tourStep >= 0 ? "running" : ""}`}
              disabled={!ready && tourStep < 0}
              onClick={() =>
                tourStep >= 0 ? setTourStep(-1) : (restart(), setTourStep(0))
              }
            >
              {tourStep >= 0 ? (
                <Square size={14} />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
              {tourStep >= 0
                ? t("停止演示", "Stop demo")
                : t("运行演示", "Run demo")}
            </button>
          </div>
        </div>
        <div className="workspace">
          <section className="world-section" id="world-panel">
            <div className="world-topline">
              <span>{t("三维视图", "3D view")}</span>
              <button
                className="text-button mobile-jump"
                onClick={() => {
                  field.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  field.current?.focus({ preventScroll: true });
                }}
              >
                {t("输入指令", "Enter instruction")}
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="viewport">
              <WorldView
                world={world}
                selected={selected}
                onSelect={setSelected}
                wireframe={wireframe}
                labels={labels}
                cameraKey={cameraKey}
              />
              <div className="view-tools">
                <button
                  className="icon-button"
                  title={t("复位视角", "Reset camera")}
                  onClick={() => setCameraKey((k) => k + 1)}
                >
                  <Maximize size={17} />
                </button>
                <button
                  className={`icon-button ${wireframe ? "active" : ""}`}
                  title={t("切换线框", "Toggle wireframe")}
                  aria-pressed={wireframe}
                  onClick={() => setWireframe(!wireframe)}
                >
                  <Box size={17} />
                </button>
              </div>
              <div className="world-hint">
                <span>{t("拖动旋转", "DRAG TO ORBIT")}</span>
                <i />
                <span className="desktop-hint">
                  {t("滚轮缩放", "SCROLL TO ZOOM")}
                </span>
                <span className="touch-hint">
                  {t("双指缩放", "PINCH TO ZOOM")}
                </span>
                <i />
                {t("点击查看物体", "CLICK TO INSPECT")}
              </div>
              {status === "loading" && (
                <div className="loading-pill">
                  <span className="spinner" />
                  {t("正在加载语言与世界…", "Loading language and world…")}
                </div>
              )}
            </div>
            <div className="world-status">
              <span>
                <span
                  className={`status-dot ${status === "busy" ? "working" : ""}`}
                />
                {world?.held
                  ? `${t("正拿着", "HOLDING")} ${world.held}`
                  : t("机械臂空闲", "ARM EMPTY")}
              </span>
              <label className="switch-label">
                {t("物体标签", "Object labels")}
                <Switch.Root
                  checked={labels}
                  onCheckedChange={setLabels}
                  className="switch"
                  aria-label="Object labels"
                >
                  <Switch.Thumb className="switch-thumb" />
                </Switch.Root>
              </label>
              <button className="text-button reset" onClick={restart}>
                <RotateCcw size={14} />
                {t("重置世界", "Reset world")}
              </button>
            </div>
            <div className="inspector">
              <div className="inspector-tabs">
                <button
                  className={panel === "objects" ? "selected" : ""}
                  onClick={() => setPanel("objects")}
                >
                  <Layers3 size={15} />
                  {t("世界中的物体", "World objects")}
                  <span>{objects.length || 9}</span>
                </button>
                <button
                  className={panel === "history" ? "selected" : ""}
                  onClick={() => setPanel("history")}
                >
                  <Code2 size={15} />
                  {t("世界状态", "World state")}
                </button>
              </div>
              {panel === "objects" ? (
                <>
                  <div className="object-list">
                    {objects.map((b) => (
                      <button
                        className={`object-chip ${selected === b.ID ? "selected" : ""}`}
                        key={b.ID}
                        onClick={() =>
                          setSelected(selected === b.ID ? null : b.ID)
                        }
                      >
                        <span
                          className={`object-symbol ${b.type}`}
                          style={
                            {
                              "--block-color": colors[b.color],
                            } as React.CSSProperties
                          }
                        />
                        <span>{blockName(b, zh)}</span>
                        <small>{b.ID.split("-")[1]}</small>
                      </button>
                    ))}
                  </div>
                  {active ? (
                    <div className="object-detail">
                      <strong>{active.ID.toUpperCase()}</strong>
                      <span>
                        {t("尺寸", "Size")} {active.dx} × {active.dy} ×{" "}
                        {active.dz}
                      </span>
                      <span>
                        {t("位置", "Position")} ({active.x.toFixed(1)},{" "}
                        {active.y.toFixed(1)}, {active.z.toFixed(1)})
                      </span>
                      <button
                        className="text-button"
                        onClick={() => {
                          setInput(
                            `Where is the ${active.color} ${active.type}?`,
                          );
                          field.current?.focus();
                        }}
                      >
                        {t("问问 SHRDLU", "Ask SHRDLU")}
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="object-detail placeholder">
                      <Box size={14} />
                      {t(
                        "选择物体查看尺寸和位置。",
                        "Select an object to inspect its size and position.",
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="state-view">
                  <div>
                    <span>SIMULATION TICK</span>
                    <b>{world?.time ?? "—"}</b>
                  </div>
                  <div>
                    <span>PERCEIVED FACTS</span>
                    <b>{world?.facts ?? "—"}</b>
                  </div>
                  <div>
                    <span>HELD OBJECT</span>
                    <b>{world?.held ?? "∅"}</b>
                  </div>
                  <code>
                    {status === "busy"
                      ? t(
                          "正在执行当前指令…",
                          "Executing the current instruction…",
                        )
                      : (world?.action ??
                        t(
                          "等待下一条指令。",
                          "Awaiting your next instruction.",
                        ))}
                  </code>
                </div>
              )}
            </div>
          </section>
          <section className="conversation">
            <div className="conversation-header">
              <div>
                <MessageSquare size={18} />
                <h2>{t("对话", "Conversation")}</h2>
                <button
                  className="text-button mobile-jump"
                  onClick={() =>
                    document
                      .getElementById("world-panel")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  {t("查看世界", "View world")}
                </button>
              </div>
              <span className={`engine-status ${status}`}>
                {status === "ready"
                  ? t("等待输入", "READY")
                  : status === "busy"
                    ? t("思考与执行中", "REASONING")
                    : status === "error"
                      ? t("需要重置", "RESET NEEDED")
                      : t("启动中", "STARTING")}
              </span>
            </div>
            <div
              className="conversation-scroll"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              <div className="message assistant welcome">
                <p>
                  {t(
                    "输入移动指令或状态问题，或选择下方示例。",
                    "Enter a movement instruction or state question, or choose an example.",
                  )}
                </p>
                <div className="starter-prompts">
                  {prompts.slice(0, 3).map(([cn, en]) => (
                    <button
                      disabled={!ready}
                      key={en}
                      onClick={() => {
                        submit(zh ? cn : en);
                      }}
                    >
                      <span>{zh ? cn : en}</span>
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
                <div className="engine-caption">
                  <span className="tiny-dot" />
                  {t(
                    "支持英文与受控中文句式",
                    "English input · Controlled Chinese",
                  )}
                </div>
              </div>
              {messages.map((m) => (
                <div className={`message ${m.role}`} key={m.id}>
                  <div className="message-meta">
                    {m.role === "assistant" ? (
                      <span className="avatar">S</span>
                    ) : m.role === "user" ? (
                      <span className="user-mark">↳</span>
                    ) : (
                      <Terminal size={14} />
                    )}
                    <strong>
                      {m.role === "assistant"
                        ? "SHRDLU"
                        : m.role === "user"
                          ? t("你", "YOU")
                          : t("提示", "NOTE")}
                    </strong>
                    <span>{m.time}</span>
                  </div>
                  <p>{m.text}</p>
                  {m.translation && (
                    <p className="translation">↳ {m.translation}</p>
                  )}
                  {zh && m.role === "assistant" && translateReply(m.text) && (
                    <p className="translation">{translateReply(m.text)}</p>
                  )}
                </div>
              ))}
              {status === "busy" && (
                <div className="thinking">
                  <span />
                  <span />
                  <span />
                  {t("正在理解与执行…", "Reasoning and acting…")}
                </div>
              )}
              <div ref={bottom} />
            </div>
            <div className="composer">
              <div className="composer-top">
                <span>
                  {t("输入指令或问题", "AN INSTRUCTION OR A QUESTION")}
                </span>
                <button
                  title={t("导出对话", "Export conversation")}
                  className="icon-button"
                  disabled={!messages.length}
                  onClick={download}
                >
                  <Download size={14} />
                </button>
              </div>
              <div className={`input-box ${status === "error" ? "error" : ""}`}>
                <textarea
                  ref={field}
                  aria-label={t("对 SHRDLU 说些什么", "Message SHRDLU")}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t(
                    "试试：把蓝色积木放进盒子里。",
                    "Try: Put the blue block in the box.",
                  )}
                  rows={2}
                  maxLength={600}
                />
                <button
                  className="send-button"
                  disabled={!ready || !input.trim() || tourStep >= 0}
                  onClick={send}
                  aria-label={t("发送", "Send")}
                >
                  <Send size={17} />
                </button>
              </div>
              <div className="composer-foot">
                <span>
                  <kbd>↵</kbd> {t("发送", "Send")} <kbd>shift ↵</kbd>{" "}
                  {t("换行", "New line")}
                </span>
                <span>EN / 中文</span>
              </div>
            </div>
          </section>
        </div>
        <div className="below-workspace">
          <div>
            <span className="archive-icon">
              <History size={18} />
            </span>
            <div>
              <strong>
                {t("原版对话试验", "Original conversation trial")}
              </strong>
              <p>
                {t(
                  "从初始世界按顺序发送，实际结果可能与原始记录不同。",
                  "Send in order from the initial world. Actual results may differ from the historical record.",
                )}
              </p>
            </div>
          </div>
          <button
            className="text-button"
            disabled={!ready || tourStep >= 0}
            onClick={() => {
              if (
                submit(zh ? classic[classicStep].zh : classic[classicStep].en)
              )
                setClassicStep((i) => (i + 1) % classic.length);
            }}
          >
            <span>{String(classicStep + 1).padStart(2, "0")} / 43</span>
            {t("试验下一句", "Try next line")}
            <ChevronRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}
