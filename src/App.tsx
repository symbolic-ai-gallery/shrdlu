import { useEffect, useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { ThemeToggle, useTheme } from "./components/Theme";
import ComposerDock from "./components/ComposerDock";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  Globe2,
  Layers,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Scan,
  X,
} from "lucide-react";
import WorldView, { blockName, colors } from "./components/WorldView";
import type { CameraAction } from "./components/WorldView";
import type { MotionPhase } from "./engine/types";
import { useEngine } from "./engine/useEngine";
import { translateReply } from "./engine/chinese";
import { useWorldTools } from "./engine/webmcp";
import classic from "./engine/classic.json";
const examples = [
  ["拿起一个大的红色积木块。", "Pick up a big red block."],
  ["把蓝色积木放进盒子里。", "Put the blue block in the box."],
  ["盒子里装着什么？", "What does the box contain?"],
  ["绿色棱锥在哪里？", "Where is the green pyramid?"],
];
const demo = [
  "Pick up a big red block.",
  "Put it on the table.",
  "Put the green pyramid in the box.",
  "What does the box contain?",
];
const phases: Record<MotionPhase, [string, string]> = {
  approach: ["接近", "Approaching"],
  descend: ["下降", "Descending"],
  grasp: ["夹紧", "Grasping"],
  lift: ["抬升", "Lifting"],
  transfer: ["搬运", "Moving"],
  lower: ["放下", "Lowering"],
  release: ["松开", "Releasing"],
  retreat: ["收回", "Retracting"],
};
export default function App() {
  const { dark } = useTheme();
  const { world, messages, status, submit, reset, acknowledge, generation } =
    useEngine();
  useWorldTools(world, status, submit);
  const [zh, setZh] = useState(true),
    [input, setInput] = useState(""),
    [dialog, setDialog] = useState<"examples" | "objects" | "reset" | null>(
      null,
    ),
    [selected, setSelected] = useState<string | null>(null),
    [labels, setLabels] = useState(false),
    [wireframe, setWireframe] = useState(false),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1),
    [step, setStep] = useState(0),
    [demoStep, setDemoStep] = useState(-1),
    [newMessages, setNewMessages] = useState(false),
    [error, setError] = useState("");
  const [cameraAction, setCameraAction] = useState<CameraAction>({
    id: 0,
    kind: "reset",
  });
  const inputRef = useRef<HTMLTextAreaElement>(null),
    scroller = useRef<HTMLDivElement>(null),
    follow = useRef(true),
    shell = useRef<HTMLDivElement>(null);
  const t = (cn: string, en: string) => (zh ? cn : en),
    ready = status === "ready",
    busy = status === "busy";
  const objects =
      world?.objects.filter((b) => !["table", "arm"].includes(b.type)) ?? [],
    object = objects.find((b) => b.ID === selected),
    moving = objects.find((b) => b.ID === world?.motion?.objectId);
  useEffect(() => {
    document.documentElement.lang = zh ? "zh-CN" : "en";
  }, [zh]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const fit = () => {
      if (!shell.current) return;
      shell.current.style.setProperty(
        "--lab-height",
        `${viewport?.height ?? innerHeight}px`,
      );
      shell.current.style.setProperty(
        "--viewport-offset",
        `${viewport?.offsetTop ?? 0}px`,
      );
      shell.current.dataset.keyboard = String(
        (viewport?.height ?? innerHeight) < window.innerHeight * 0.78,
      );
      document.documentElement.dataset.keyboard =
        shell.current.dataset.keyboard;
    };
    fit();
    viewport?.addEventListener("resize", fit);
    viewport?.addEventListener("scroll", fit);
    window.addEventListener("resize", fit);
    return () => {
      viewport?.removeEventListener("resize", fit);
      viewport?.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
      delete document.documentElement.dataset.keyboard;
    };
  }, []);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (follow.current) {
      el.scrollTop = el.scrollHeight;
      setNewMessages(false);
    } else setNewMessages(true);
  }, [messages, status]);
  useEffect(() => {
    if (status === "loading" || status === "ready") setPaused(false);
  }, [status]);
  useEffect(() => {
    if (demoStep < 0 || !ready) return;
    if (demoStep >= demo.length) {
      setDemoStep(-1);
      return;
    }
    const timer = setTimeout(() => {
      submit(demo[demoStep]);
      setDemoStep((n) => n + 1);
    }, 450);
    return () => clearTimeout(timer);
  }, [demoStep, ready, submit]);
  function send() {
    if (!input.trim()) {
      setError(t("请输入指令或问题。", "Enter an instruction or question."));
      inputRef.current?.focus();
      return;
    }
    if (!ready) return;
    follow.current = true;
    if (submit(input)) {
      setInput("");
      setError("");
    }
  }
  function resetAll() {
    setDemoStep(-1);
    setSelected(null);
    setPaused(false);
    setStep(0);
    setInput("");
    follow.current = true;
    setDialog(null);
    reset();
  }
  function camera(kind: CameraAction["kind"]) {
    setCameraAction((c) => ({ id: c.id + 1, kind }));
  }
  function exportText() {
    const url = URL.createObjectURL(
      new Blob(
        [
          messages
            .map(
              (m) =>
                `${m.role.toUpperCase()}: ${m.text}${m.translation ? `\n${m.translation}` : ""}`,
            )
            .join("\n\n"),
        ],
        { type: "text/plain;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "shrdlu-conversation.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function fill(text: string) {
    setInput(text);
    setError("");
    setDialog(null);
  }
  const stateText =
    status === "loading"
      ? t("加载中…", "Loading…")
      : status === "error"
        ? t("需要重置", "Reset required")
        : busy
          ? paused
            ? t("已暂停", "Paused")
            : world?.motion
              ? `${phases[world.motion.phase][zh ? 0 : 1]}${moving ? ` · ${blockName(moving, zh)}` : ""}`
              : t("正在推理…", "Reasoning…")
          : world?.held
            ? t(
                `拿着 ${blockName(
                  objects.find((b) => b.ID === world.held)!,
                  true,
                )}`,
                `Holding ${world.held}`,
              )
            : "";
  return (
    <div className="lab" ref={shell}>
      <a
        href="#instruction"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        {t("跳到输入框", "Skip to input")}
      </a>
      <header className="lab-header">
        <a
          href="#"
          className="lab-home"
          aria-label={t("返回背景页", "Back to background")}
        >
          <ArrowLeft aria-hidden="true" />
          <span>SHRDLU</span>
        </a>
        <div className="lab-header-actions">
          <ThemeToggle zh={zh} />
          <Button
            className="ui-button ghost"
            onClick={() => setDialog("examples")}
          >
            <BookOpen aria-hidden="true" />
            {t("示例", "Examples")}
          </Button>
          <Menu.Root>
            <Menu.Trigger
              className="ui-button icon ghost"
              aria-label={t("更多操作", "More actions")}
            >
              <MoreHorizontal />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={6} align="end">
                <Menu.Popup className="ui-menu">
                  <Menu.Group>
                    <Menu.Item
                      className="ui-menu-item"
                      onClick={() => setDialog("objects")}
                    >
                      <Layers />
                      {t("物体", "Objects")}
                    </Menu.Item>
                    <Menu.Item
                      className="ui-menu-item"
                      onClick={() => setZh(!zh)}
                    >
                      <Globe2 />
                      {zh ? "English" : "中文"}
                    </Menu.Item>
                    <Menu.Item
                      className="ui-menu-item"
                      disabled={!messages.length}
                      onClick={exportText}
                    >
                      <Download />
                      {t("导出对话", "Export conversation")}
                    </Menu.Item>
                  </Menu.Group>
                  <Menu.Separator className="ui-separator" />
                  <Menu.Group>
                    <Menu.CheckboxItem
                      className="ui-menu-item"
                      checked={labels}
                      onCheckedChange={setLabels}
                    >
                      {t("显示标签", "Show labels")}
                      <Menu.CheckboxItemIndicator>
                        <Check />
                      </Menu.CheckboxItemIndicator>
                    </Menu.CheckboxItem>
                    <Menu.CheckboxItem
                      className="ui-menu-item"
                      checked={wireframe}
                      onCheckedChange={setWireframe}
                    >
                      {t("线框", "Wireframe")}
                      <Menu.CheckboxItemIndicator>
                        <Check />
                      </Menu.CheckboxItemIndicator>
                    </Menu.CheckboxItem>
                  </Menu.Group>
                  <Menu.Separator className="ui-separator" />
                  <Menu.Group>
                    <Menu.Item
                      className="ui-menu-item"
                      disabled={!ready && demoStep < 0}
                      onClick={() => {
                        if (demoStep >= 0) setDemoStep(-1);
                        else {
                          resetAll();
                          setDemoStep(0);
                        }
                      }}
                    >
                      <Play />
                      {demoStep >= 0
                        ? t("结束自动演示", "End automatic demo")
                        : t("运行演示", "Run demo")}
                    </Menu.Item>
                    <Menu.Item
                      className="ui-menu-item danger"
                      onClick={() => setDialog("reset")}
                    >
                      <RotateCcw />
                      {t("重置世界…", "Reset world…")}
                    </Menu.Item>
                  </Menu.Group>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </header>
      <main className="lab-workspace">
        <section
          className="lab-stage"
          aria-label={t("积木世界", "Blocks world")}
        >
          <WorldView
            dark={dark}
            key={generation}
            world={world}
            selected={selected}
            onSelect={setSelected}
            labels={labels}
            wireframe={wireframe}
            cameraAction={cameraAction}
            paused={paused}
            speed={speed}
            onComplete={acknowledge}
          />
          {stateText && (
            <div className="motion-status" role="status">
              <span
                className={paused ? "paused-dot" : busy ? "busy-dot" : ""}
              />
              {stateText}
            </div>
          )}
          <div className="stage-camera">
            <Menu.Root>
              <Menu.Trigger
                className="ui-button icon surface"
                aria-label={t("相机控制", "Camera controls")}
              >
                <Scan />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="end">
                  <Menu.Popup className="ui-menu">
                    <Menu.Group>
                      {(
                        [
                          ["reset", "复位视角", "Reset view"],
                          ["in", "放大", "Zoom in"],
                          ["out", "缩小", "Zoom out"],
                          ["left", "向左旋转", "Rotate left"],
                          ["right", "向右旋转", "Rotate right"],
                        ] as const
                      ).map(([kind, cn, en]) => (
                        <Menu.Item
                          key={kind}
                          className="ui-menu-item"
                          onClick={() => camera(kind)}
                        >
                          {t(cn, en)}
                        </Menu.Item>
                      ))}
                    </Menu.Group>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
          {busy && (
            <div className="playback">
              <Button
                className="ui-button surface"
                onClick={() => setPaused(!paused)}
                aria-label={
                  paused
                    ? t("继续动作", "Resume motion")
                    : t("暂停动作", "Pause motion")
                }
              >
                {paused ? <Play /> : <Pause />}
                {paused ? t("继续", "Resume") : t("暂停", "Pause")}
              </Button>
              <Menu.Root>
                <Menu.Trigger
                  className="ui-button surface"
                  aria-label={t("动作速度", "Motion speed")}
                >
                  {speed}×
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner sideOffset={6}>
                    <Menu.Popup className="ui-menu">
                      <Menu.RadioGroup
                        value={speed}
                        onValueChange={(value) => setSpeed(Number(value))}
                      >
                        {[0.5, 1, 2].map((value) => (
                          <Menu.RadioItem
                            className="ui-menu-item"
                            value={value}
                            key={value}
                          >
                            {value}×
                            <Menu.RadioItemIndicator>
                              <Check />
                            </Menu.RadioItemIndicator>
                          </Menu.RadioItem>
                        ))}
                      </Menu.RadioGroup>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            </div>
          )}
          {object && (
            <div className="selection-card">
              <div>
                <span
                  className="color-dot"
                  style={{ background: colors[object.color] }}
                />
                <strong>{blockName(object, zh)}</strong>
                <span>{object.ID}</span>
                <Button
                  className="ui-button icon ghost"
                  aria-label={t("关闭物体信息", "Close object info")}
                  onClick={() => setSelected(null)}
                >
                  <X />
                </Button>
              </div>
              <p>
                {t("尺寸", "Size")} {object.dx} × {object.dy} × {object.dz}
                <span>
                  {t("位置", "Position")} {object.x.toFixed(0)},{" "}
                  {object.y.toFixed(0)}, {object.z.toFixed(0)}
                </span>
              </p>
            </div>
          )}
        </section>
        <section className="lab-chat" aria-label={t("对话", "Conversation")}>
          <div
            className="chat-scroll"
            ref={scroller}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            onScroll={() => {
              const el = scroller.current!;
              follow.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 60;
              if (follow.current) setNewMessages(false);
            }}
          >
            {!messages.length && (
              <div className="empty-prompts">
                {examples.slice(0, 2).map(([cn, en]) => (
                  <Button
                    className="prompt-button"
                    disabled={!ready}
                    key={en}
                    onClick={() => {
                      follow.current = true;
                      submit(zh ? cn : en);
                    }}
                  >
                    {zh ? cn : en}
                    <ChevronRight />
                  </Button>
                ))}
              </div>
            )}
            {messages.map((m) => {
              const translation =
                zh && m.role === "assistant" ? translateReply(m.text) : null;
              const translated =
                translation && !/[a-z]/i.test(translation) ? translation : null;
              return (
                <div className={`chat-message ${m.role}`} key={m.id}>
                  <p>{translated ?? m.text}</p>
                  {(m.translation || translated) && (
                    <details className="message-original">
                      <summary>{t("英文", "English")}</summary>
                      <p>{m.translation ?? m.text}</p>
                    </details>
                  )}
                </div>
              );
            })}
            {busy && !world?.motion && (
              <div className="chat-thinking">
                {t("正在推理…", "Reasoning…")}
              </div>
            )}
          </div>
          {newMessages && (
            <Button
              className="ui-button surface unread"
              onClick={() => {
                follow.current = true;
                scroller.current!.scrollTop = scroller.current!.scrollHeight;
                setNewMessages(false);
              }}
            >
              <ArrowDown />
              {t("新消息", "New messages")}
            </Button>
          )}
          <ComposerDock>
            <form
              className="chat-composer"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label htmlFor="instruction" className="sr-only">
                {t("指令或问题", "Instruction or question")}
              </label>
              <div className="composer-field">
                <textarea
                  id="instruction"
                  name="instruction"
                  ref={inputRef}
                  rows={2}
                  maxLength={600}
                  autoComplete="off"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      (e.metaKey || e.ctrlKey) &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t(
                    "输入指令或问题…",
                    "Enter an instruction or question…",
                  )}
                  aria-invalid={!!error}
                  aria-describedby={error ? "input-error" : undefined}
                />
                <Button
                  type="submit"
                  className="ui-button icon primary"
                  disabled={!ready || demoStep >= 0}
                  aria-label={t(
                    "发送（Ctrl / ⌘ + Enter）",
                    "Send (Ctrl / ⌘ + Enter)",
                  )}
                >
                  <ArrowUp />
                </Button>
              </div>
              {error && (
                <p id="input-error" className="input-error" role="alert">
                  {error}
                </p>
              )}
              {status === "error" && (
                <Button className="ui-button ghost" onClick={resetAll}>
                  {t("重置并重试", "Reset and retry")}
                </Button>
              )}
            </form>
          </ComposerDock>
        </section>
      </main>
      <Dialog.Root
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="ui-backdrop" />
          <Dialog.Popup
            className={`ui-dialog ${dialog === "reset" ? "compact" : ""}`}
          >
            <div className="dialog-heading">
              <Dialog.Title>
                {dialog === "examples"
                  ? t("示例与原版记录", "Examples & original transcript")
                  : dialog === "objects"
                    ? t("物体", "Objects")
                    : t("重置世界？", "Reset world?")}
              </Dialog.Title>
              <Dialog.Close
                className="ui-button icon ghost"
                aria-label={t("关闭", "Close")}
              >
                <X />
              </Dialog.Close>
            </div>
            {dialog === "examples" && (
              <div className="dialog-scroll">
                <Dialog.Description className="dialog-description">
                  {t(
                    "选择一句填入输入框。",
                    "Select a sentence to fill the input.",
                  )}
                </Dialog.Description>
                <div className="example-list">
                  {examples.map(([cn, en]) => (
                    <Button
                      className="example-row"
                      key={en}
                      onClick={() => fill(zh ? cn : en)}
                    >
                      {zh ? cn : en}
                      <ChevronRight />
                    </Button>
                  ))}
                </div>
                <details className="classic-details">
                  <summary>
                    {t("原版对话", "Original conversation")}
                    <span>43</span>
                  </summary>
                  <div className="classic-actions">
                    <span>{step + 1} / 43</span>
                    <Button
                      className="ui-button"
                      disabled={!ready}
                      onClick={() => {
                        submit(zh ? classic[step].zh : classic[step].en);
                        setStep((n) => (n + 1) % 43);
                        setDialog(null);
                      }}
                    >
                      {t("发送下一句", "Send next line")}
                      <ChevronRight />
                    </Button>
                  </div>
                  {classic.map((line, i) => (
                    <div className="classic-row" key={i}>
                      <span>{i + 1}</span>
                      <div>
                        <Button
                          className="classic-input"
                          onClick={() => fill(zh ? line.zh : line.en)}
                        >
                          {zh ? line.zh : line.en}
                        </Button>
                        <details>
                          <summary>
                            {t("原版回答", "Historical answer")}
                          </summary>
                          <p>{line.answer}</p>
                        </details>
                      </div>
                    </div>
                  ))}
                </details>
              </div>
            )}
            {dialog === "objects" && (
              <div className="dialog-scroll object-rows">
                {objects.map((b) => (
                  <Button
                    className="object-row"
                    key={b.ID}
                    onClick={() => {
                      setSelected(b.ID);
                      setDialog(null);
                    }}
                  >
                    <span
                      className="color-dot"
                      style={{ background: colors[b.color] }}
                    />
                    <span>{blockName(b, zh)}</span>
                    <small>{b.ID}</small>
                    <ChevronRight />
                  </Button>
                ))}
              </div>
            )}
            {dialog === "reset" && (
              <>
                <Dialog.Description className="dialog-description">
                  {t(
                    "物体、对话和学到的名称将恢复初始状态。",
                    "Objects, conversation, and learned names will return to their initial state.",
                  )}
                </Dialog.Description>
                <div className="dialog-actions">
                  <Dialog.Close className="ui-button">
                    {t("取消", "Cancel")}
                  </Dialog.Close>
                  <Button className="ui-button primary" onClick={resetAll}>
                    {t("重置", "Reset")}
                  </Button>
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
