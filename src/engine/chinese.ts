import classic from "./classic.json";
const normalize = (s: string) =>
  s.replace(/[。？！?!.，,\s“”"「」]/g, "").toLowerCase();
const dictionary: Record<string, string> = {
  红: "red",
  红色: "red",
  绿: "green",
  绿色: "green",
  蓝: "blue",
  蓝色: "blue",
  白: "white",
  白色: "white",
  大: "big",
  大的: "big",
  小: "small",
  小的: "small",
  最大: "biggest",
  最大的: "biggest",
  最小: "smallest",
  最小的: "smallest",
  最高: "tallest",
  最高的: "tallest",
  最矮: "shortest",
  最矮的: "shortest",
  积木: "block",
  积木块: "block",
  方块: "cube",
  立方体: "cube",
  立方块: "cube",
  棱锥: "pyramid",
  金字塔: "pyramid",
  盒: "box",
  盒子: "box",
  箱子: "box",
  桌: "table",
  桌子: "table",
  桌面: "table",
  它: "it",
  那个: "the",
  这个: "the",
  一个: "a",
  一块: "a",
  一个大: "a big",
  两个: "two",
  所有: "all",
};
const keys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
export function noun(phrase: string): string | null {
  let rest = phrase.replace(/的/g, "").trim(),
    words: string[] = [];
  while (rest) {
    const key = keys.find((k) => rest.startsWith(k));
    if (!key) return null;
    words.push(dictionary[key]);
    rest = rest.slice(key.length);
  }
  const value = words.join(" ");
  return /^(it|the |a |all |two )/.test(value) ? value : `the ${value}`;
}
export function toEnglish(input: string): {
  text: string;
  translated: boolean;
  error?: string;
} {
  if (!/[\u3400-\u9fff]/.test(input))
    return {
      text: input.replace(/[。]/g, ".").replace(/[？]/g, "?"),
      translated: false,
    };
  const exact = classic.find((t) => normalize(t.zh) === normalize(input));
  if (exact) return { text: exact.en, translated: true };
  const clean = input.replace(/[。？！，\s]/g, "").replace(/^请/, "");
  const simple: Record<string, string> = {
    你好: "Hello.",
    谢谢: "Thank you.",
    为什么: "Why?",
    你拿着什么: "What are you holding?",
    你正拿着什么: "What are you holding?",
    放下它: "Put it on the table.",
    把它放下: "Put it on the table.",
    盒子里有什么: "What is in the box?",
    盒子里有啥: "What is in the box?",
    桌上有什么: "What is on the table?",
    你做了什么: "What did you do?",
  };
  if (simple[clean]) return { text: simple[clean], translated: true };
  let m = clean.match(/^(?:拿起|抓住|拾起|举起)(.+)$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `Pick up ${n}.`, translated: true };
  }
  m = clean.match(
    /^(?:把|将)(.+?)(?:放到|放在|放进|移到)(.+?)(上面|上|里面|里|内)?$/,
  );
  if (m) {
    const a = noun(m[1]),
      b = noun(m[2]);
    if (a && b)
      return {
        text: `Put ${a} ${/放进/.test(clean) || /里面|里|内/.test(m[3] || "") ? "in" : "on"} ${b}.`,
        translated: true,
      };
  }
  m = clean.match(/^(.+?)(?:是什么颜色|什么颜色)$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `What color is ${n}?`, translated: true };
  }
  m = clean.match(/^(.+?)(?:在哪里|在哪|在哪儿)$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `Where is ${n}?`, translated: true };
  }
  m = clean.match(/^(?:有多少|一共有多少)(?:个|块)?(.+)$/);
  if (m) {
    const n = noun(m[1]);
    if (n)
      return {
        text: `How many ${n.replace(/^the /, "").replace(/box$/, "boxe")}s are there?`,
        translated: true,
      };
  }
  return {
    text: input,
    translated: false,
    error:
      "暂未识别这个中文句式。可使用“拿起红色积木”“把它放进盒子里”“蓝色棱锥在哪里”，或切换英文自由输入。",
  };
}
export function translateReply(text: string): string | null {
  const simple: Record<string, string> = {
    Ok: "好的。",
    OK: "好的。",
    red: "红色。",
    blue: "蓝色。",
    green: "绿色。",
    Yes: "是的。",
    No: "不是。",
    "You are welcome": "不客气。",
    "You're welcome": "不客气。",
    Hello: "你好。",
    "I do not know": "我不知道。",
  };
  const clean = text.replace(/[.!]$/, "");
  if (simple[clean]) return simple[clean];
  if (/I can not disambiguate/i.test(text))
    return "这个描述对应多个物体，请用颜色、大小或空间关系说明你指的是哪一个。";
  if (
    /I do not understand|I cannot understand|I can not understand/i.test(text)
  )
    return "我暂时无法理解这个表达，请尝试换一种说法。";
  const objectText = (s: string) =>
    s
      .replace(
        /the red (block|cube|pyramid)/g,
        (_, shape: string) =>
          "红色" +
          (
            { block: "积木", cube: "立方块", pyramid: "棱锥" } as Record<
              string,
              string
            >
          )[shape],
      )
      .replace(
        /the green (block|cube|pyramid)/g,
        (_, shape: string) =>
          "绿色" +
          (
            { block: "积木", cube: "立方块", pyramid: "棱锥" } as Record<
              string,
              string
            >
          )[shape],
      )
      .replace(
        /the blue (block|cube|pyramid)/g,
        (_, shape: string) =>
          "蓝色" +
          (
            { block: "积木", cube: "立方块", pyramid: "棱锥" } as Record<
              string,
              string
            >
          )[shape],
      )
      .replace(/the box/g, "盒子")
      .replace(/the table/g, "桌子")
      .replace(/, /g, "、")
      .replace(/\.$/, "。");
  const translated = objectText(text);
  if (/^the (?:red|green|blue|box|table)/.test(text)) return translated;
  if (/^Yes[,.:]/.test(text))
    return objectText(
      text.replace(/^Yes, by /, "是的，由").replace(/^Yes[:,]?\s*/, "是的，"),
    );
  if (/^No, \d/.test(text))
    return objectText(text.replace(/^No, /, "不是，只有 "));
  if (/^\d+(?:[.:])/.test(text))
    return objectText(text.replace(/^(\d+)[:.]\s*/, "$1 个："));
  if (text.startsWith("Do you mean 1"))
    return "你是指：1 — 直接放在表面上；2 — 位于其上方的任意位置？请回复 1 或 2。";
  if (text === "Because you asked me to.") return "因为你让我这样做。";
  if (text.startsWith("I cannot explain a non-existent"))
    return "我无法解释没有发生过的事件。我没有把物体扔下来。";
  return null;
}
