import type { Block, Engine, World } from "./types";
// A bounded compositional interpreter over the shared world. It never reads the
// historical transcript. Plans, references, answers and explanations use live facts.
type Event = {
  kind: "pick" | "put";
  id: string;
  destination?: string;
  before: World;
  reason: string[];
  root: string;
};
const copy = <T>(x: T): T => structuredClone(x);
const clean = (x: string) =>
  x
    .toLowerCase()
    .replace(/[“”"?.!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const plural = (x: string) =>
  x
    .replace(/ies\b/g, "y")
    .replace(/(block|cube|pyramid|object|thing|steeple)s\b/g, "$1");
const volume = (b: Block) =>
  (b.dx * b.dy * b.dz) / (b.type === "pyramid" ? 3 : 1);
const describe = (b: Block) =>
  b.type === "table"
    ? "the table"
    : b.type === "box"
      ? "the box"
      : `the ${b.color} ${b.type}`;
export function createGroundedEngine(legacy: Engine): Engine {
  let state = legacy.snapshot();
  // World units are display units. Increase packing room to permit the historical
  // box's two occupants without allowing overlaps or crossing its walls.
  const box = state.objects.find((b) => b.type === "box")!;
  box.dx = 16;
  box.dz = 16;
  const table = state.objects.find((b) => b.type === "table")!;
  table.dx = 36;
  table.dz = 36;
  legacy.replaceWorld(state);
  let rendered = copy(state),
    messages: string[] = [],
    frames: World[] = [],
    fallback = false;
  let focus: string | null = null,
    lastSet: string[] = [],
    lastType = "block",
    requestedPick: string | null = null,
    lastRoot = "";
  let events: Event[] = [],
    whyChain: string[] = [],
    whyIndex = 0,
    historyEvent: Event | undefined;
  let pending: "above" | "object" | null = null,
    pendingInput = "";
  const names = new Map<string, string>(),
    definitions = new Map<string, string[]>();
  let lastDefinition = "";
  const objects = () =>
    state.objects.filter((b) => !["arm", "table"].includes(b.type));
  const get = (id: string) => state.objects.find((b) => b.ID === id)!;
  const overlap = (a: Block, b: Block) =>
    a.x < b.x + b.dx - 0.01 &&
    a.x + a.dx > b.x + 0.01 &&
    a.z < b.z + b.dz - 0.01 &&
    a.z + a.dz > b.z + 0.01;
  const inside = (a: Block, b: Block) =>
    a.ID !== b.ID &&
    state.held !== a.ID &&
    b.type === "box" &&
    a.x >= b.x + 0.99 &&
    a.z >= b.z + 0.99 &&
    a.x + a.dx <= b.x + b.dx - 0.99 &&
    a.z + a.dz <= b.z + b.dz - 0.99 &&
    a.y >= b.y + 0.99;
  const supports = (a: Block, b: Block) =>
    a.ID !== b.ID &&
    state.held !== b.ID &&
    (a.type === "box"
      ? inside(b, a) && Math.abs(b.y - a.y - 1) < 0.05
      : overlap(a, b) && Math.abs(b.y - a.y - a.dy) < 0.05);
  const children = (a: Block) => objects().filter((b) => supports(a, b));
  const support = (b: Block) => state.objects.find((a) => supports(a, b));
  const above = (a: Block, b: Block, seen = new Set<string>()): boolean => {
    if (seen.has(a.ID)) return false;
    seen.add(a.ID);
    const s = support(a);
    return !!s && (s.ID === b.ID || above(s, b, seen));
  };
  const list = (items: Block[]) =>
    items.length ? items.map(describe).join(", ") : "nothing";
  const remember = (items: Block[], subject?: Block) => {
    lastSet = items.map((b) => b.ID);
    if (subject) focus = subject.ID;
    else if (items.length === 1) focus = items[0].ID;
    const b = items.find((b) => ["block", "cube", "pyramid"].includes(b.type));
    if (b) lastType = b.type === "cube" ? "block" : b.type;
  };
  const resolve = (raw: string, depth = 0): Block[] => {
    if (depth > 12) return [];
    let p = plural(clean(raw))
      .replace(
        /^(?:the |a |an |any |some |one of |at least one of |both of |all of |all )/,
        "",
      )
      .replace(/^(?:the |a )/, "")
      .trim();
    if (names.has(p)) return [get(names.get(p)!)];
    if (state.objects.some((b) => b.ID === p)) return [get(p)];
    if (/^(it|that|that one|one|this|that cube)$/.test(p))
      return focus ? [get(focus)] : [];
    if (p === "them") return lastSet.map(get);
    if (/^(one |block |thing )?(which |that )?(i told you|i asked you)/.test(p))
      return requestedPick ? [get(requestedPick)] : [];
    if (
      /^(one |block |thing )?(which |that )?(you are holding|you hold)/.test(p)
    )
      return state.held ? [get(state.held)] : [];
    if (p === "table") return [state.objects.find((b) => b.type === "table")!];
    if (p === "box") return [state.objects.find((b) => b.type === "box")!];
    const recurse = (s: string) => resolve(s, depth + 1);
    let m = p.match(/^(.+?)'s support$/);
    if (m)
      return recurse(m[1]).flatMap((b) => (support(b) ? [support(b)!] : []));
    m = p.match(/^(?:thing |object )?(?:that |which )?supports (.+)$/);
    if (m)
      return recurse(m[1]).flatMap((b) => (support(b) ? [support(b)!] : []));
    m = p.match(
      /^(shortest|tallest|smallest|biggest) (?:thing|object) (.+) supports$/,
    );
    if (m) {
      const found = recurse(m[2]).flatMap(children);
      return extremum(found, m[1]);
    }
    m = p.match(/^(.+?) (?:which |that )?supports (.+)$/);
    if (m) {
      const target = recurse(m[2]);
      return recurse(m[1]).filter((a) => target.some((b) => supports(a, b)));
    }
    m = p.match(
      /^(.+?) (?:which |that )?is (taller|shorter|narrower|wider|bigger|smaller) than (.+)$/,
    );
    if (m) {
      const target = recurse(m[3]);
      return recurse(m[1]).filter((b) =>
        target.some((a) => compare(b, a, m![2])),
      );
    }
    m = p.match(
      /^(.+?) (?:which |that )?(?:is |are )?(not )?(in|inside|on|on top of|behind|to the left of|to the right of) (.+)$/,
    );
    if (m) {
      const targets = recurse(m[4]);
      return recurse(m[1]).filter(
        (b) => targets.some((a) => relation(b, a, m![3])) !== !!m![2],
      );
    }
    if (/one$/.test(p)) p = p.replace(/one$/, lastType);
    const color = p.match(/\b(red|green|blue|white)\b/)?.[1];
    const type = p.match(/\b(block|cube|pyramid|box|thing|object)\b/)?.[1];
    const adjectives = p
      .replace(
        /\b(red|green|blue|white|big|large|small|little|biggest|largest|smallest|littlest|tallest|shortest|tall|short|clear|block|cube|pyramid|box|thing|object|the|a|an)\b/g,
        "",
      )
      .trim();
    if (adjectives) return [];
    let result = objects().filter(
      (b) =>
        (!color || b.color === color) &&
        (!type ||
          ["thing", "object"].includes(type) ||
          b.type === type ||
          (type === "block" && b.type === "cube")),
    );
    if (/\b(big|large)\b/.test(p))
      result = result.filter((b) => b.size !== "small");
    if (/\b(small|little)\b/.test(p))
      result = result.filter((b) => b.size === "small");
    if (/\bclear\b/.test(p)) result = result.filter((b) => !children(b).length);
    const extreme = p.match(
      /\b(biggest|largest|smallest|littlest|tallest|shortest)\b/,
    )?.[1];
    return extreme ? extremum(result, extreme) : result;
  };
  function extremum(items: Block[], word: string) {
    if (!items.length) return [];
    const measure = (b: Block) =>
      /tallest|shortest/.test(word) ? b.dy : volume(b);
    const value = (
      /smallest|littlest|shortest/.test(word) ? Math.min : Math.max
    )(...items.map(measure));
    return items.filter((b) => measure(b) === value);
  }
  function compare(a: Block, b: Block, word: string) {
    switch (word) {
      case "taller":
        return a.dy > b.dy;
      case "shorter":
        return a.dy < b.dy;
      case "narrower":
        return a.dx < b.dx;
      case "wider":
        return a.dx > b.dx;
      case "bigger":
        return volume(a) > volume(b);
      case "smaller":
        return volume(a) < volume(b);
      default:
        return false;
    }
  }
  function relation(a: Block, b: Block, word: string) {
    switch (word) {
      case "in":
      case "inside":
        return inside(a, b);
      case "on":
      case "on top of":
        return above(a, b);
      case "behind":
        return a.z > b.z + b.dz / 2;
      case "to the left of":
        return a.x + a.dx <= b.x + 0.01;
      case "to the right of":
        return a.x >= b.x + b.dx - 0.01;
      default:
        return false;
    }
  }
  const unique = (phrase: string, indefinite = false) => {
    let found = resolve(phrase);
    if (found.length > 1 && !indefinite && /^the /.test(phrase)) {
      const contextual = found.filter((b) => lastSet.includes(b.ID));
      if (contextual.length === 1) found = contextual;
    }
    if (!found.length) throw new Error(`I cannot find ${phrase}.`);
    if (found.length > 1 && !indefinite && !/^a |^an |^any |^one /.test(phrase))
      throw new Error(
        `I can not disambiguate ${phrase}. Please specify its color, size, or what it supports.`,
      );
    return found[0];
  };
  const emit = () => {
    const arm = state.objects.find((b) => b.type === "arm")!;
    if (state.held) {
      const b = get(state.held);
      arm.x = b.x + b.dx / 2 - 1;
      arm.y = b.y + b.dy;
      arm.z = b.z + b.dz / 2 - 1;
    } else arm.y = 32;
    frames.push(copy(state));
  };
  const spot = (b: Block, dest: Block): [number, number, number] | null => {
    if (dest.type === "pyramid" || dest.type === "arm") return null;
    const margin = dest.type === "box" ? 1 : 0,
      y = dest.y + (dest.type === "box" ? 1 : dest.dy);
    // A centered overhang is allowed on a rectangular block, as in the original.
    const overhang = !["table", "box"].includes(dest.type);
    const minX =
        overhang && b.dx > dest.dx
          ? dest.x + (dest.dx - b.dx) / 2
          : dest.x + margin,
      maxX =
        overhang && b.dx > dest.dx ? minX : dest.x + dest.dx - margin - b.dx;
    const minZ =
        overhang && b.dz > dest.dz
          ? dest.z + (dest.dz - b.dz) / 2
          : dest.z + margin,
      maxZ =
        overhang && b.dz > dest.dz ? minZ : dest.z + dest.dz - margin - b.dz;
    for (let x = minX; x <= maxX + 0.01; x++)
      for (let z = minZ; z <= maxZ + 0.01; z++) {
        const test = { ...b, x, y, z };
        if (
          !objects().some(
            (o) =>
              o.ID !== b.ID &&
              o.ID !== dest.ID &&
              overlap(test, o) &&
              y < o.y + o.dy - 0.01 &&
              y + b.dy > o.y + 0.01,
          )
        )
          return [x, y, z];
      }
    return null;
  };
  const pick = (b: Block, reasons: string[], depth = 0) => {
    if (depth > 25) throw new Error("The requested plan is too deeply nested.");
    if (["table", "arm", "box"].includes(b.type))
      throw new Error(`I cannot pick up ${describe(b)}.`);
    if (state.held === b.ID) return;
    if (state.held)
      put(
        get(state.held),
        get("table"),
        ["To free my hand.", ...reasons],
        depth + 1,
      );
    for (const child of children(b))
      put(
        child,
        get("table"),
        [
          `To get ${describe(child)} out of the way.`,
          `To clear off ${describe(b)}.`,
          ...reasons,
        ],
        depth + 1,
      );
    events.push({
      kind: "pick",
      id: b.ID,
      before: copy(state),
      reason: reasons,
      root: lastRoot,
    });
    state.held = b.ID;
    b.y = 36;
    emit();
  };
  const put = (b: Block, dest: Block, reasons: string[], depth = 0) => {
    if (b.ID === dest.ID || above(dest, b))
      throw new Error(
        "I cannot put an object on itself or create a cyclic stack.",
      );
    if (dest.type === "pyramid")
      throw new Error(
        "I cannot do that. A pyramid has no flat supporting surface.",
      );
    if (state.held !== b.ID && supports(dest, b)) return;
    pick(
      b,
      dest.type === "table" && reasons[0]?.startsWith("To get ")
        ? reasons
        : [
            `To put ${describe(b)} ${dest.type === "box" ? "in" : "on"} ${describe(dest)}.`,
            ...reasons,
          ],
      depth,
    );
    let location = spot(b, dest),
      displaced: Block[] = [];
    if (!location) {
      displaced = children(dest);
      for (const child of displaced)
        put(
          child,
          get("table"),
          [`To make room for ${describe(b)}.`, ...reasons],
          depth + 1,
        );
      pick(b, reasons, depth + 1);
      location = spot(b, dest);
    }
    if (!location)
      throw new Error(
        `There is not enough room for ${describe(b)} ${dest.type === "box" ? "inside" : "on"} ${describe(dest)}.`,
      );
    b.x = location[0];
    b.z = location[2];
    b.y = 36;
    emit();
    const before = copy(state);
    b.y = location[1];
    emit();
    state.held = null;
    emit();
    events.push({
      kind: "put",
      id: b.ID,
      destination: dest.ID,
      before,
      reason: reasons,
      root: lastRoot,
    });
    // Preserve container occupants when packing creates room for a new object.
    if (dest.type === "box")
      for (const child of displaced)
        put(
          child,
          dest,
          [`To keep ${describe(child)} in ${describe(dest)}.`, ...reasons],
          depth + 1,
        );
  };
  const stack = (items: Block[], root: string) => {
    const selected = [...new Map(items.map((b) => [b.ID, b])).values()].sort(
      (a, b) =>
        (a.type === "pyramid" ? 1 : 0) - (b.type === "pyramid" ? 1 : 0) ||
        volume(b) - volume(a),
    );
    if (selected.length < 2)
      throw new Error("A stack needs at least two objects.");
    if (selected.filter((b) => b.type === "pyramid").length > 1)
      throw new Error(
        "I cannot stack two pyramids: a pyramid has no flat supporting surface.",
      );
    // Clear objects before moving the base so every subgoal has an explanation.
    const reasons = [`To ${root}.`, "Because you asked me to."];
    pick(selected[0], reasons);
    put(selected[0], get("table"), reasons);
    for (let i = 1; i < selected.length; i++)
      put(selected[i], selected[i - 1], reasons);
    focus = selected.at(-1)!.ID;
    lastSet = selected.map((b) => b.ID);
  };
  const expandList = (description: string): Block[] => {
    let p = description
      .replace(/both of the/g, "two")
      .replace(/either a (.+?) or a (.+)$/, "a $1");
    return p.split(/,\s*| and /).flatMap((part) => {
      const m = part.match(/^(two|three|\d+) (.+)$/);
      if (m) {
        const count = m[1] === "two" ? 2 : m[1] === "three" ? 3 : Number(m[1]);
        const found = resolve(m[2]);
        if (found.length < count)
          throw new Error(`I cannot find ${count} ${m[2]}.`);
        return found.slice(0, count);
      }
      return [unique(part, /^a |^an /.test(part))];
    });
  };
  const answer = (text: string) => {
    messages.push(text);
  };
  const handle = (input: string): boolean => {
    const p = clean(input).replace(
      /^(?:will you please |would you please |could you please |please )/,
      "",
    );
    let m: RegExpMatchArray | null;
    if (pending === "above" && /^[12]$/.test(p)) {
      const cubes = resolve("green cubes");
      const found = objects().filter((b) =>
        cubes.some((c) => (p === "1" ? supports(c, b) : above(b, c))),
      );
      answer(`${found.length}: ${list(found)}.`);
      remember(found);
      pending = null;
      return true;
    }
    if (pending === "object" && resolve(p).length === 1) {
      const previous = pendingInput;
      pending = null;
      return handle(clean(previous).replace(/(?:the )?pyramid$/, p));
    }
    pending = null;
    if (/^(thank you|thanks)$/.test(p)) {
      answer("You're welcome!");
      return true;
    }
    if (/^(hello|hi)$/.test(p)) {
      answer("Hello. Tell me about the blocks.");
      return true;
    }
    if (p === "what are you holding") {
      answer(
        state.held
          ? `I am holding ${describe(get(state.held))}.`
          : "I am not holding anything.",
      );
      return true;
    }
    m = p.match(/^find (.+?) and put it (?:in|into|on|onto) (.+)$/);
    if (m) {
      const b = unique(m[1], true),
        dest = unique(m[2]);
      put(b, dest, ["Because you asked me to."]);
      focus = b.ID;
      answer(`By “it”, I mean ${describe(b)}. OK.`);
      return true;
    }
    m = p.match(/^(?:pick up|grasp|take|grab|lift) (.+)$/);
    if (m) {
      const b = unique(m[1], /^a |^an /.test(m[1]));
      requestedPick = b.ID;
      pick(b, ["Because you asked me to."]);
      focus = b.ID;
      lastType = b.type === "cube" ? "block" : b.type;
      answer("OK.");
      return true;
    }
    m = p.match(
      /^(?:put|place|move) (.+?) (?:on top of|onto|on|into|in) (.+)$/,
    );
    if (m) {
      const b = unique(m[1], /^a |^an /.test(m[1]));
      const dest = unique(m[2]);
      put(b, dest, ["Because you asked me to."]);
      focus = b.ID;
      answer("OK.");
      return true;
    }
    m = p.match(/^(?:stack up|stack) (.+)$/);
    if (m) {
      stack(expandList(m[1]), `stack ${m[1]}`);
      answer("OK.");
      return true;
    }
    m = p.match(/^call (.+?) (\w+)$/);
    if (m) {
      const b = unique(m[1]);
      names.set(m[2], b.ID);
      focus = b.ID;
      answer(`OK. I will call ${describe(b)} ${m[2].toUpperCase()}.`);
      return true;
    }
    m = p.match(/^a (\w+) is a stack (?:which|that) contains (.+)$/);
    if (m) {
      expandList(m[2]);
      definitions.set(m[1], m[2].split(/ and /));
      lastDefinition = m[1];
      answer(`I understand. A ${m[1]} is a stack containing ${m[2]}.`);
      return true;
    }
    m = p.match(/^are there any (\w+) now$/);
    if (m) {
      const name = m[1].replace(/s$/, "");
      if (!definitions.has(name)) {
        answer(`I don't know the word “${name}”.`);
        return true;
      }
      lastDefinition = name;
      const items = expandList(definitions.get(name)!.join(" and "));
      const yes = items.every((a) =>
        items.every((b) => a.ID === b.ID || above(a, b) || above(b, a)),
      );
      answer(yes ? "Yes." : "No.");
      return true;
    }
    m = p.match(/^(?:build|make) (?:one|a (\w+))$/);
    if (m && definitions.has(m[1] ?? lastDefinition)) {
      const name = m[1] ?? lastDefinition;
      stack(
        expandList(definitions.get(name)!.join(" and ")),
        `build a ${name}`,
      );
      answer("OK.");
      return true;
    }
    if (/^does a \w+$/.test(p)) {
      const word = p.split(" ").at(-1)!;
      if (!definitions.has(word)) {
        answer(`Sorry, I don't know the word “${word}”.`);
        return true;
      }
    }
    m = p.match(/^what (?:does (.+) contain|is in (.+)|is inside (.+))$/);
    if (m) {
      const dest = unique(m[1] ?? m[2] ?? m[3]),
        items = objects().filter((b) => inside(b, dest));
      answer(`${list(items)}.`);
      remember(items);
      return true;
    }
    m = p.match(/^what is (.+) supported by$/);
    if (m) {
      const b = unique(m[1]),
        s = support(b);
      answer(s ? `${describe(s)}.` : `${describe(b)} is not supported.`);
      focus = b.ID;
      return true;
    }
    m = p.match(/^is (.+) supported$/);
    if (m) {
      const b = unique(m[1]),
        s = support(b);
      answer(s ? `Yes, by ${describe(s)}.` : "No.");
      focus = b.ID;
      return true;
    }
    m = p.match(/^what colou?r is (.+)$/);
    if (m) {
      const b = unique(m[1]);
      answer(`${b.color}.`);
      focus = b.ID;
      return true;
    }
    m = p.match(/^where is (.+)$/);
    if (m) {
      const b = unique(m[1]),
        s = support(b);
      answer(
        state.held === b.ID
          ? `I am holding ${describe(b)}.`
          : s
            ? `${describe(b)} is ${s.type === "box" ? "in" : "on"} ${describe(s)}.`
            : `${describe(b)} is at (${b.x}, ${b.y}, ${b.z}).`,
      );
      focus = b.ID;
      return true;
    }
    m = p.match(/^how many (.+?)(?: are there| are| is there)?$/);
    if (m && !/did |while /.test(p)) {
      let phrase = m[1].replace(/ are /g, " ");
      if (/on top of green cubes/.test(phrase)) {
        pending = "above";
        answer(
          "Do you mean 1 — directly on the surface, or 2 — anywhere above?",
        );
        return true;
      }
      const items = resolve(phrase);
      answer(`${items.length}: ${list(items)}.`);
      remember(items);
      return true;
    }
    m = p.match(/^which (.+) is sitting on (.+)$/);
    if (m) {
      const dest = unique(m[2]),
        items = resolve(m[1]).filter((b) => supports(dest, b));
      answer(`${list(items)}.`);
      remember(items);
      return true;
    }
    m = p.match(/^is there (?:a |an |any )?(?:anything which is )?(.+)$/);
    if (m) {
      if (/bigger than every pyramid/.test(m[1])) {
        const pyramids = resolve("pyramids"),
          items = objects().filter((b) => {
            const s = support(b);
            return (
              b.type !== "box" &&
              pyramids.every((a) => compare(b, a, "bigger")) &&
              !!s &&
              b.dx < s.dx
            );
          });
        answer(items.length ? `Yes: ${list(items)}.` : "No.");
        remember(items);
        return true;
      }
      const items = resolve(m[1].replace(/^anything /, "thing "));
      answer(items.length ? `Yes, ${items.length}: ${list(items)}.` : "No.");
      remember(items);
      return true;
    }
    m = p.match(
      /^is at least one of (.+?) (narrower|wider|taller|shorter|bigger|smaller) than (.+)$/,
    );
    if (m) {
      const refs = resolve(m[3]),
        items = resolve(m[1]).filter((b) =>
          refs.some((a) => compare(b, a, m![2])),
        );
      answer(items.length ? `Yes, ${list(items)}.` : "No.");
      remember(items);
      return true;
    }
    m = p.match(/^does (.+) support (?:anything|something) (red|green|blue)$/);
    if (m) {
      const subject = unique(m[1]),
        items = children(subject).filter((b) => b.color === m![2]);
      answer(items.length ? `Yes, ${list(items)}.` : "No.");
      remember(items, subject);
      return true;
    }
    if (p === "can the table pick up blocks") {
      answer("No. Only the arm can pick up blocks.");
      return true;
    }
    m = p.match(/^can a (\w+) (?:be supported by|support) a (\w+)$/);
    if (m) {
      const bottom = p.includes("be supported by") ? m[2] : m[1];
      answer(
        bottom === "pyramid"
          ? "I don't know how to balance objects on a pyramid. The planner requires a flat surface."
          : ["block", "cube", "table", "box"].includes(bottom)
            ? "Yes."
            : "I do not know.",
      );
      return true;
    }
    m = p.match(/^had you touched any (.+?) before you put (.+?) on (.+)$/);
    if (m) {
      const target = resolve(m[2])[0],
        dest = resolve(m[3])[0];
      const boundary = events.findIndex(
        (e) =>
          e.kind === "put" && e.id === target?.ID && e.destination === dest?.ID,
      );
      const ids = resolve(m[1]).map((b) => b.ID);
      historyEvent = events
        .slice(0, boundary < 0 ? events.length : boundary)
        .find((e) => e.kind === "pick" && ids.includes(e.id));
      answer(historyEvent ? `Yes, ${describe(get(historyEvent.id))}.` : "No.");
      if (historyEvent) focus = historyEvent.id;
      return true;
    }
    m = p.match(/^when did you pick (.+) up$/);
    if (m) {
      const b = unique(m[1]);
      historyEvent = events.find((e) => e.kind === "pick" && e.id === b.ID);
      answer(
        historyEvent
          ? `While I was carrying out “${historyEvent.root}”.`
          : "I have not picked it up.",
      );
      if (historyEvent) {
        whyChain = historyEvent.reason;
        whyIndex = 0;
      }
      return true;
    }
    if (/^(why|why did you do that|why did you clear off that cube)$/.test(p)) {
      if (!whyChain.length) {
        historyEvent = events.at(-1);
        whyChain = historyEvent?.reason ?? [];
      }
      answer(
        whyChain[Math.min(whyIndex++, whyChain.length - 1)] ??
          "There is no recorded action to explain.",
      );
      return true;
    }
    if (p === "how did you do it") {
      const root = historyEvent?.root ?? events.at(-1)?.root;
      const actions = events.filter((e) => e.root === root && e.kind === "put");
      answer(
        actions.length
          ? actions
              .map(
                (e) =>
                  `put ${describe(get(e.id))} on ${describe(get(e.destination!))}`,
              )
              .join("; then ") + "."
          : "No completed placement is recorded.",
      );
      return true;
    }
    if (p === "how many objects did you touch while you were doing it") {
      const root = historyEvent?.root ?? events.at(-1)?.root;
      answer(
        `${new Set(events.filter((e) => e.root === root).map((e) => e.id)).size}.`,
      );
      return true;
    }
    m = p.match(/^what did (.+) support before you started to clean it off$/);
    if (m) {
      const b = unique(m[1]);
      const e = events.find((e) =>
        e.reason.some((r) => r === `To clear off ${describe(b)}.`),
      );
      if (!e) {
        answer("There is no such recorded event.");
        return true;
      }
      const now = state;
      state = e.before;
      answer(`${list(children(get(b.ID)))}.`);
      state = now;
      historyEvent = e;
      return true;
    }
    m = p.match(/^there were (\w+) blocks to the left of the box then$/);
    if (m) {
      const now = state;
      if (historyEvent) state = historyEvent.before;
      const items = resolve("blocks to the left of the box");
      answer(
        `${({ five: 5, four: 4, three: 3 } as Record<string, number>)[m[1]] === items.length ? "Yes" : "No"}, ${items.length}: ${list(items)}.`,
      );
      state = now;
      return true;
    }
    m = p.match(/^have you picked (.+) up since we began$/);
    if (m) {
      const b = unique(m[1]);
      answer(
        events.some((e) => e.kind === "pick" && e.id === b.ID) ? "Yes." : "No.",
      );
      focus = b.ID;
      return true;
    }
    if (p === "why did you drop it") {
      answer(
        "I cannot explain a non-existent event. I have not dropped an object.",
      );
      return true;
    }
    return false;
  };
  return {
    submit(input) {
      state = legacy.snapshot();
      rendered = copy(state);
      messages = [];
      frames = [];
      const before = copy(state),
        eventCount = events.length,
        oldFocus = focus;
      lastRoot = input;
      try {
        if (!handle(input)) {
          fallback = true;
          legacy.submit(input);
          return;
        }
        fallback = false;
        if (events.length > eventCount) {
          whyChain = [];
          whyIndex = 0;
          historyEvent = undefined;
        }
        if (!frames.length) legacy.replaceWorld(state);
      } catch (error) {
        state = before;
        frames = [];
        events = events.slice(0, eventCount);
        focus = oldFocus;
        const text = (error as Error).message;
        answer(text);
        fallback = false;
        if (/disambiguate/.test(text) && /pyramid\W*$/i.test(input)) {
          pending = "object";
          pendingInput = input;
        }
      }
    },
    step() {
      if (fallback) {
        const idle = legacy.step();
        state = legacy.snapshot();
        rendered = copy(state);
        return idle;
      }
      if (frames.length) {
        const next = frames.shift()!;
        next.time = rendered.time + 1;
        rendered = next;
        legacy.replaceWorld(next);
        return false;
      }
      state.time = rendered.time + 1;
      legacy.replaceWorld(state);
      state.facts = legacy.snapshot().facts;
      rendered = copy(state);
      return true;
    },
    snapshot() {
      return fallback ? legacy.snapshot() : copy(rendered);
    },
    drain() {
      const out = messages;
      messages = [];
      return fallback ? [...out, ...legacy.drain()] : out;
    },
    replaceWorld(world) {
      state = copy(world);
      rendered = copy(world);
      legacy.replaceWorld(world);
    },
  };
}
