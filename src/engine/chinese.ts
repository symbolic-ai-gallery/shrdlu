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
  赤红: "red",
  深红: "red",
  大: "big",
  大的: "big",
  大型: "big",
  大号: "big",
  巨大: "big",
  小: "small",
  小的: "small",
  小型: "small",
  小号: "small",
  微小: "small",
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
  砖块: "block",
  长方体: "block",
  方块: "cube",
  立方体: "cube",
  立方块: "cube",
  棱锥: "pyramid",
  金字塔: "pyramid",
  锥体: "pyramid",
  盒: "box",
  盒子: "box",
  箱子: "box",
  箱体: "box",
  容器: "box",
  桌: "table",
  桌子: "table",
  桌面: "table",
  工作台: "table",
  台面: "table",
  物体: "object",
  物件: "object",
  东西: "thing",
  它: "it",
  它们: "them",
  这些: "them",
  那些: "them",
  那个: "the",
  这个: "the",
  那块: "the",
  这块: "the",
  一个: "a",
  一块: "a",
  任意一个: "any",
  任意: "any",
  某个: "a",
  某块: "a",
  两个: "two",
  两块: "two",
  全部: "all",
  所有: "all",
  个: "",
  块: "",
};
const keys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
export function noun(phrase: string): string | null {
  let raw = phrase.trim();
  if (/^[A-Za-z][\w-]*$/.test(raw)) return raw;
  const relationalPatterns: Array<[RegExp, string]> = [
    [/^(.+?)(?:里面|之中|里|内|中)的?(.+)$/, "in"],
    [/^(.+?)(?:上面|上方|顶部|上)的?(.+)$/, "on"],
    [/^(.+?)(?:下面|下方|底下|下)的?(.+)$/, "under"],
    [/^(.+?)(?:左边|左侧)的?(.+)$/, "to the left of"],
    [/^(.+?)(?:右边|右侧)的?(.+)$/, "to the right of"],
    [/^(.+?)(?:后面|后方)的?(.+)$/, "behind"],
    [/^(.+?)(?:前面|前方)的?(.+)$/, "in front of"],
  ];
  for (const [pattern, relation] of relationalPatterns) {
    const match = raw.match(pattern);
    if (match) {
      const reference = noun(match[1]),
        subject = noun(match[2]);
      if (reference && subject) return `${subject} ${relation} ${reference}`;
    }
  }
  let supported = raw.match(/^(?:支撑着?|托着)(.+?)的(.+)$/);
  if (supported) {
    const target = noun(supported[1]),
      subject = noun(supported[2]);
    if (target && subject) return `${subject} which supports ${target}`;
  }
  supported = raw.match(/^被(.+?)(?:支撑着?|托着)的(.+)$/);
  if (supported) {
    const support = noun(supported[1]),
      subject = noun(supported[2]);
    if (support && subject) return `${subject} directly on ${support}`;
  }
  let rest = raw.replace(/的/g, "").trim(),
    words: string[] = [];
  while (rest) {
    const key = keys.find((k) => rest.startsWith(k));
    if (!key) return null;
    words.push(dictionary[key]);
    rest = rest.slice(key.length);
  }
  const value = words.filter(Boolean).join(" ");
  return /^(it|them|the |a |any |all |two )/.test(value)
    ? value
    : `the ${value}`;
}

function nounList(phrase: string): string | null {
  const parts = phrase.split(/、|以及|和|与/).filter(Boolean),
    translated = parts.map(noun);
  return translated.every((part): part is string => !!part)
    ? translated.join(" and ")
    : null;
}

function pluralNoun(phrase: string): string {
  return phrase
    .replace(/^(?:the|a|an|any|all) /, "")
    .replace(/\bbox\b/, "boxes")
    .replace(/\b(block|cube|pyramid|object|thing)\b/, "$1s");
}

function cleanChinese(input: string): string {
  let value = input
    .normalize("NFKC")
    .replace(/[。？?！!，,；;：:\s“”"「」]/g, "");
  const prefixes =
    /^(?:能不能帮我|可以请你|请帮我|麻烦你|帮我看看|告诉我|请问|请你|你能不能|你可以|看一下|看看|能否|可否|劳驾|麻烦|帮我|请)/;
  while (prefixes.test(value)) value = value.replace(prefixes, "");
  return value.replace(/呢$/, "");
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
  const clean = cleanChinese(input);
  const simple: Record<string, string> = {
    你好: "Hello.",
    谢谢: "Thank you.",
    为什么: "Why?",
    你拿着什么: "What are you holding?",
    你正拿着什么: "What are you holding?",
    你手里有什么: "What are you holding?",
    你手上有什么: "What are you holding?",
    放下它: "Put it on the table.",
    把它放下: "Put it on the table.",
    盒子里有什么: "What is in the box?",
    盒子里有啥: "What is in the box?",
    桌上有什么: "What is on the table?",
    你做了什么: "What did you do?",
  };
  if (simple[clean]) return { text: simple[clean], translated: true };
  const command = clean.replace(/(?:好吗|好不好|可以吗|行吗|吧)$/, "");
  let m = command.match(
    /^(?:拿起|拿住|抓住|抓起|拾起|捡起|举起|取出|拿一下|拿)(.+)$/,
  );
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `Pick up ${n}.`, translated: true };
  }
  m = command.match(/^(?:把|将)(.+?)(?:拿起|拿起来|抓起|抓住|举起)$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `Pick up ${n}.`, translated: true };
  }
  m = command.match(/^(?:把|将)?(.+?)(?:放下|松开)$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `Put ${n} down.`, translated: true };
  }
  m = command.match(
    /^(?:把|将)?(.+?)(放进去|放进|放入|装进|移进|塞进|放置到|放到|放在|摆到|摆在|移动至|移到|挪到|置于)(.+)$/,
  );
  if (m) {
    const a = noun(m[1]),
      verb = m[2];
    let destination = m[3],
      relation = /进|装|塞/.test(verb) ? "in" : "on";
    if (/(?:里面|里|内|之中|中)$/.test(destination)) relation = "in";
    destination = destination.replace(
      /(?:的)?(?:上面|上方|顶部|上|里面|里|内|之中|中)$/,
      "",
    );
    const b = noun(destination);
    if (a && b)
      return {
        text: `Put ${a} ${relation} ${b}.`,
        translated: true,
      };
  }
  m = command.match(
    /^(?:在)?(.+?)(上面|上|里面|里|内|中)(?:放置|放|摆|置)(.+)$/,
  );
  if (m) {
    const destination = noun(m[1]),
      object = noun(m[3]);
    if (destination && object)
      return {
        text: `Put ${object} ${/里|内/.test(m[2]) ? "in" : "on"} ${destination}.`,
        translated: true,
      };
  }
  m = command.match(/^(?:把|将)?(.+?)(?:叠起来|堆起来|摞起来|堆叠)$/);
  if (m) {
    const items = nounList(m[1]);
    if (items) return { text: `Stack ${items}.`, translated: true };
  }
  m = clean.match(/^(.+?)(?:是什么颜色|什么颜色|是哪种颜色)$/);
  if (!m) m = clean.match(/^(.+?)的颜色是什么$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `What color is ${n}?`, translated: true };
  }
  m = clean.match(/^(.+?)(?:在哪里|在哪|在哪儿|在什么位置|位于哪里)$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `Where is ${n}?`, translated: true };
  }
  m = clean.match(
    /^(.+?)(里面|里|内|中|上面|上)(?:有|放着|摆着|装着)(?:多少|几)(?:个|块)?(.+)$/,
  );
  if (m) {
    const container = noun(m[1]),
      objects = noun(m[3]);
    if (container && objects)
      return {
        text: `How many ${pluralNoun(objects)} are ${/里|内|中/.test(m[2]) ? "in" : "on"} ${container}?`,
        translated: true,
      };
  }
  m = clean.match(/^(?:有|一共|总共)?(?:多少|几)(?:个|块)?(.+)$/);
  if (m) {
    const n = noun(m[1]);
    if (n)
      return {
        text: `How many ${pluralNoun(n)} are there?`,
        translated: true,
      };
  }
  m = clean.match(
    /^(.+?)(里面|里|内|中|上面|上)(?:有|放着|摆着|装着)?(?:什么|什么东西|哪些东西|哪些物体|啥)$/,
  );
  if (m) {
    const n = noun(m[1]);
    if (n)
      return {
        text: `What is ${/里|内|中/.test(m[2]) ? "in" : "on"} ${n}?`,
        translated: true,
      };
  }
  m = clean.match(/^(.+?)(?:由什么|被什么)(?:支撑|托着)$/);
  if (!m) m = clean.match(/^什么(?:支撑|托着)(.+)$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `What supports ${n}?`, translated: true };
  }
  m = clean.match(/^(.+?)(?:支撑着|托着)(?:什么|哪些东西|哪些物体)$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `What does ${n} support?`, translated: true };
  }
  m = clean.match(/^(.+?)(?:有支撑物吗|有东西支撑吗|被支撑着吗)$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `Is ${n} supported?`, translated: true };
  }
  m = clean.match(/^(?:有没有|是否有)(.+)$/);
  if (!m) m = clean.match(/^有(.+?)吗$/);
  if (m) {
    const n = noun(m[1].replace(/吗$/, ""));
    if (n)
      return {
        text: `Are there any ${pluralNoun(n)}?`,
        translated: true,
      };
  }
  m = clean.match(
    /^(.+?)(?:在|位于)(.+?)(里面|里|内|中|上面|上方|上|左边|左侧|右边|右侧|后面|后方|前面|前方)吗?$/,
  );
  if (m) {
    const subject = noun(m[1]),
      reference = noun(m[2]);
    const relations: Record<string, string> = {
      里面: "in",
      里: "in",
      内: "in",
      中: "in",
      上面: "on",
      上方: "above",
      上: "on",
      左边: "to the left of",
      左侧: "to the left of",
      右边: "to the right of",
      右侧: "to the right of",
      后面: "behind",
      后方: "behind",
      前面: "in front of",
      前方: "in front of",
    };
    if (subject && reference)
      return {
        text: `Is ${subject} ${relations[m[3]]} ${reference}?`,
        translated: true,
      };
  }
  m = clean.match(/^(.+?)比(.+?)(?:更)?(高|矮|宽|窄|大|小)吗?$/);
  if (m) {
    const subject = noun(m[1]),
      reference = noun(m[2]);
    const comparisons: Record<string, string> = {
      高: "taller",
      矮: "shorter",
      宽: "wider",
      窄: "narrower",
      大: "bigger",
      小: "smaller",
    };
    if (subject && reference)
      return {
        text: `Is ${subject} ${comparisons[m[3]]} than ${reference}?`,
        translated: true,
      };
  }
  m = clean.match(/^(?:列出|显示|找出)(.+)$/);
  if (m) {
    const n = noun(m[1]);
    if (n) return { text: `List ${n}.`, translated: true };
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
    "I am not holding anything": "我现在没有拿着任何物体。",
    nothing: "没有物体。",
  };
  const clean = text.replace(/[.!]$/, "");
  if (simple[clean]) return simple[clean];
  if (/I can not disambiguate/i.test(text))
    return "这个描述对应多个物体，请用颜色、大小或空间关系说明你指的是哪一个。";
  if (
    /I do not understand|I cannot understand|I can not understand/i.test(text)
  )
    return "我暂时无法理解这个表达，请尝试换一种说法。";
  const colors: Record<string, string> = {
      red: "红色",
      green: "绿色",
      blue: "蓝色",
      white: "白色",
    },
    shapes: Record<string, string> = {
      block: "积木",
      cube: "立方块",
      pyramid: "棱锥",
    };
  const objectText = (s: string) =>
    s
      .replace(
        /\b(?:the|a|an) (red|green|blue|white) (block|cube|pyramid)\b/gi,
        (_, color: string, shape: string) =>
          colors[color.toLowerCase()] + shapes[shape.toLowerCase()],
      )
      .replace(/\b(?:the|a|an) box\b/gi, "盒子")
      .replace(/\b(?:the|a|an) table\b/gi, "桌子")
      .replace(/\bnothing\b/gi, "没有物体")
      .replace(/, /g, "、")
      .replace(/\.$/, "。");
  let match = text.match(/^I am holding (.+)\.$/i);
  if (match) return `我正拿着${objectText(match[1])}。`;
  match = text.match(/^(.+?) is (in|on) (.+)\.$/i);
  if (match)
    return `${objectText(match[1])}${match[2].toLowerCase() === "in" ? "在" : "位于"}${objectText(match[3])}${match[2].toLowerCase() === "in" ? "里" : "上"}。`;
  match = text.match(/^(.+?) is at \((.+)\)\.$/i);
  if (match) return `${objectText(match[1])}位于坐标（${match[2]}）。`;
  match = text.match(/^(.+?) is not supported\.$/i);
  if (match) return `${objectText(match[1])}没有支撑物。`;
  match = text.match(/^I cannot find (.+)\.$/i);
  if (match) return `我找不到${objectText(match[1])}。`;
  match = text.match(/^(.+?) is not in (.+)\.$/i);
  if (match) return `${objectText(match[1])}不在${objectText(match[2])}里。`;
  if (/^I cannot pick up /i.test(text))
    return objectText(text.replace(/^I cannot pick up /i, "我无法拿起"));
  if (/cyclic stack/i.test(text))
    return "不能让物体支撑自身，也不能形成循环堆叠。";
  if (/pyramid has no flat supporting surface/i.test(text))
    return "无法这样放置：棱锥没有平坦的支撑面。";
  if (/not enough room/i.test(text))
    return objectText(
      text.replace(/^There is not enough room for /i, "没有足够空间容纳"),
    );
  const translated = objectText(text);
  if (/^the (?:red|green|blue|white|box|table)/.test(text)) return translated;
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
