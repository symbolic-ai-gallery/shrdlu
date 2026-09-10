import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createEngine } from "../src/engine/generated/legacy";
import { createGroundedEngine } from "../src/engine/grounded";
import { toEnglish, translateReply } from "../src/engine/chinese";
import { normalizeEnglish } from "../src/engine/language";
import classic from "../src/engine/classic.json";
import type { Engine, World } from "../src/engine/types";
const resources = Object.fromEntries(
  ["shrdluontology.xml", "nlpatternrules.xml", "blocksworld-kb.xml"].map(
    (f) => [f, readFileSync(`public/engine/${f}`, "utf8")],
  ),
);
const fresh = () => createGroundedEngine(createEngine(resources));
function run(e: Engine, text: string) {
  e.submit(text);
  let n = 0;
  while (!e.step()) {
    if (n++ > 10000) throw new Error("Engine did not become idle");
  }
  const reply = e.drain().join(" ");
  return { reply, world: e.snapshot() };
}
const obj = (s: World, id: string) => s.objects.find((b) => b.ID === id)!;
function assertStableWorld(s: World) {
  const movable = s.objects.filter(
    (b) => !["arm", "table", "box"].includes(b.type),
  );
  for (const b of movable) {
    expect(Number.isFinite(b.x + b.y + b.z)).toBe(true);
    expect(b.y).toBeGreaterThanOrEqual(4);
  }
  for (const a of movable)
    for (const b of movable) {
      if (a.ID >= b.ID) continue;
      const intersect =
        a.x < b.x + b.dx - 0.01 &&
        a.x + a.dx > b.x + 0.01 &&
        a.y < b.y + b.dy - 0.01 &&
        a.y + a.dy > b.y + 0.01 &&
        a.z < b.z + b.dz - 0.01 &&
        a.z + a.dz > b.z + 0.01;
      expect(intersect, `Overlapping ${a.ID} and ${b.ID}`).toBe(false);
    }
}
beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());
describe("the complete historical conversation", () => {
  for (const language of ["en", "zh"] as const) {
    it(`executes all 43 ${language} turns with state-based answers and valid geometry`, () => {
      const e = fresh(),
        replies: string[] = [];
      for (const [i, line] of classic.entries()) {
        const mapped = toEnglish(line[language]);
        expect(mapped.error).toBeUndefined();
        const { reply, world } = run(e, mapped.text);
        replies.push(reply);
        expect(reply, `Turn ${i + 1}`).not.toMatch(
          /TypeError|undefined|Cannot read|can not parse|I do not understand|no such recorded|no recorded action/i,
        );
        expect(reply.length).toBeGreaterThan(0);
        assertStableWorld(world);
        if (i === 0) expect(world.held).toBe("block-3");
        if (i === 1) expect(world.held).toBe("block-3");
        if (i === 2) {
          const b = obj(world, "block-5"),
            box = obj(world, "box-8");
          expect(b.x).toBeGreaterThan(box.x);
          expect(b.z).toBeGreaterThan(box.z);
          expect(b.y).toBe(box.y + 1);
        }
        if (i === 5) expect(reply).toMatch(/^4:/);
        if (i === 6) expect(reply).toMatch(/red cube/);
        if (i === 12) {
          const red = obj(world, "block-3"),
            green = obj(world, "cube-6"),
            small = obj(world, "cube-4");
          expect(green.y).toBe(red.y + red.dy);
          expect(small.y).toBe(green.y + green.dy);
        }
        if (i === 17) expect(reply).toBe("Yes, the green pyramid.");
        if (i === 18) expect(reply).toBe("red.");
        if (i === 19) expect(reply).toContain("1 — directly");
        if (i === 20) expect(reply).toMatch(/^3:/);
        if (i === 21) expect(reply).toContain("green pyramid");
        if (i === 24) expect(reply).toContain("clear off the red cube");
        if (i === 27) expect(reply).toBe("Because you asked me to.");
        if (i === 29) expect(reply).toBe("4.");
        if (i === 30) expect(reply).toBe("the green pyramid.");
        if (i === 31) expect(reply).toMatch(/^No, 4:/);
        if (i === 32)
          expect(obj(world, "pyramid-11").y).toBe(
            obj(world, "block-5").y + obj(world, "block-5").dy,
          );
        if (i === 36) expect(reply).toBe("No.");
        if (i === 37) {
          expect(run(e, "Are there any steeples now?").reply).toBe("Yes.");
        }
        if (i === 39) expect(reply).toBe("Yes.");
        if (i === 40) expect(reply).toContain("non-existent event");
      }
      expect(replies).toHaveLength(43);
    }, 30000);
  }
});
describe("counterfactuals and safety of the world model", () => {
  it("answers from changed state rather than recorded historical replies", () => {
    const e = fresh();
    run(e, "Put the green pyramid in the box.");
    let r = run(e, "What does the box contain?");
    expect(r.reply).toContain("green pyramid");
    expect(r.reply).not.toContain("blue block");
    run(e, "Put the blue pyramid on the table.");
    r = run(e, "What does the box contain?");
    expect(r.reply).not.toContain("blue pyramid");
    assertStableWorld(r.world);
  });
  it("clears objects above a requested block before grasping it", () => {
    const e = fresh();
    const r = run(e, "Pick up the red cube.");
    expect(r.world.held).toBe("cube-4");
    expect(obj(r.world, "pyramid-9").y).toBe(4);
    assertStableWorld(r.world);
  });
  it("rejects an impossible goal atomically", () => {
    const e = fresh();
    const before = e.snapshot();
    expect(run(e, "Put the red cube on the green pyramid.").reply).toContain(
      "cannot",
    );
    expect(e.snapshot().objects).toEqual(before.objects);
    expect(e.snapshot().held).toBeNull();
  });
  it("rejects self support and cyclic stacking", () => {
    const e = fresh();
    expect(run(e, "Put the red cube on the red cube.").reply).toContain(
      "cyclic",
    );
    expect(run(e, "Put the red cube on the green pyramid.").reply).toContain(
      "cyclic",
    );
  });
  it("asks for clarification, then accepts the selected description", () => {
    const e = fresh();
    expect(run(e, "Grasp the pyramid.").reply).toMatch(/disambiguate/);
    expect(run(e, "the blue pyramid").world.held).toBe("pyramid-11");
  });
  it("keeps pronouns tied to the selected object", () => {
    const e = fresh();
    run(e, "Pick up the blue block.");
    expect(run(e, "What color is it?").reply).toBe("blue.");
    run(e, "Put it in the box.");
    expect(run(e, "Where is it?").reply).toContain("in the box");
  });
  it("learns a novel object name and answers about it", () => {
    const e = fresh();
    run(e, "Call the red cube Ruby.");
    expect(run(e, "What color is Ruby?").reply).toBe("red.");
    expect(run(e, "Pick up Ruby.").world.held).toBe("cube-4");
  });
  it("learns and builds a different stack concept", () => {
    const e = fresh();
    expect(
      run(
        e,
        "A crown is a stack that contains two red blocks and a green pyramid.",
      ).reply,
    ).toContain("understand");
    expect(run(e, "Are there any crowns now?").reply).toBe("No.");
    expect(run(e, "Build a crown.").reply).toBe("OK.");
    expect(run(e, "Are there any crowns now?").reply).toBe("Yes.");
    assertStableWorld(e.snapshot());
  });
  it("provides different direct and transitive support counts", () => {
    const e = fresh();
    for (const line of classic.slice(0, 20)) run(e, line.en);
    expect(run(e, "1").reply).toMatch(/^2:/);
    run(e, "How many things are on top of green cubes?");
    expect(run(e, "2").reply).toMatch(/^3:/);
  });
  it("reset via a new engine clears object names and restores the world", () => {
    const e = fresh();
    run(e, "Call the red cube Ruby.");
    run(e, "Pick up Ruby.");
    const reset = fresh();
    expect(reset.snapshot().held).toBeNull();
    expect(run(reset, "Pick up Ruby.").reply).toContain("cannot find");
  });
  it("retains the upstream English parser as a functioning fallback", () => {
    const e = fresh();
    expect(run(e, "What is on the table?").reply).not.toMatch(
      /undefined|TypeError|parse/i,
    );
  });
});
describe("compositional Chinese adapter", () => {
  it.each([
    ["拿起蓝色积木", "Pick up the blue block."],
    ["把它放进盒子里", "Put it in the box."],
    ["把红色立方块放在桌面上", "Put the red cube on the table."],
    ["绿色棱锥在哪里", "Where is the green pyramid?"],
    ["蓝色积木是什么颜色", "What color is the blue block?"],
    ["有多少个棱锥", "How many pyramids are there?"],
  ])("%s → %s", (input, expected) =>
    expect(toEnglish(input).text).toBe(expected),
  );
  it("preserves English and explicitly rejects unsupported Chinese", () => {
    expect(toEnglish("Take the blue pyramid.").text).toBe(
      "Take the blue pyramid.",
    );
    expect(toEnglish("请给我讲个笑话").error).toBeTruthy();
  });
});

describe("expanded bilingual language", () => {
  it.each([
    ["请帮我抓起那块蓝色积木", "Pick up the blue block."],
    ["把它拿起来", "Pick up it."],
    ["红色立方块放到桌面上", "Put the red cube on the table."],
    ["在盒子里放蓝色棱锥", "Put the blue pyramid in the box."],
    ["把红色积木和蓝色棱锥叠起来", "Stack the red block and the blue pyramid."],
    ["盒子里的蓝色积木在哪里", "Where is the blue block in the box?"],
    ["红色积木的颜色是什么", "What color is the red block?"],
    ["桌上有几个绿色方块", "How many green cubes are on the table?"],
    ["容器里有啥", "What is in the box?"],
    ["什么支撑红色棱锥", "What supports the red pyramid?"],
    ["盒子支撑着什么", "What does the box support?"],
    ["有没有红色积木", "Are there any red blocks?"],
    ["红色积木在盒子里吗", "Is the red block in the box?"],
    ["请问蓝色棱锥在哪呢", "Where is the blue pyramid?"],
    ["桌子上有几块积木", "How many blocks are on the table?"],
    ["有蓝色棱锥吗", "Are there any blue pyramids?"],
    ["蓝色棱锥位于盒子中吗", "Is the blue pyramid in the box?"],
    [
      "红色立方块比蓝色积木小吗",
      "Is the red cube smaller than the blue block?",
    ],
    ["列出盒子中的积木", "List the block in the box."],
  ])("normalizes %s", (input, expected) => {
    expect(toEnglish(input)).toMatchObject({
      text: expected,
      translated: true,
    });
  });

  it.each([
    ["Where's the scarlet brick?", "where is the red block"],
    [
      "Could you please lift the azure cuboid!",
      "could you please lift the blue block",
    ],
    ["What is within the container?", "what is inside the box"],
    [
      "Which item is atop the work surface?",
      "which object is on top of the table",
    ],
  ])("normalizes English vocabulary in %s", (input, expected) => {
    expect(normalizeEnglish(input)).toBe(expected);
  });

  it("executes English paraphrases through the grounded planner", () => {
    const e = fresh();
    expect(run(e, "Could you please grab the blue brick?").world.held).toBe(
      "block-5",
    );
    expect(run(e, "What is the colour of it?").reply).toBe("blue.");
    expect(run(e, "Put it down.").world.held).toBeNull();
    expect(run(e, "Are there any scarlet bricks?").reply).toMatch(/^Yes/);
    expect(run(e, "Count the pyramids.").reply).toMatch(/^3:/);
    expect(run(e, "What supports the red pyramid?").reply).toContain("cube");
    expect(run(e, "Which pyramids are inside the crate?").reply).toContain(
      "blue pyramid",
    );
    expect(run(e, "Is the blue pyramid inside the container?").reply).toBe(
      "Yes.",
    );
    expect(
      run(e, "Is the red cube smaller than the blue block?").reply,
    ).toMatch(/^(?:Yes|No)\.$/);
  });

  it("gives equivalent Chinese and English commands the same world state", () => {
    const english = fresh(),
      chinese = fresh();
    const en = run(english, "Please pick up the blue block.").world;
    const mapped = toEnglish("请帮我拿起蓝色积木");
    expect(mapped.error).toBeUndefined();
    const zh = run(chinese, mapped.text).world;
    expect(zh.held).toBe(en.held);
    expect(zh.objects).toEqual(en.objects);

    const enPlaced = run(english, "Put it on the table.").world,
      placement = toEnglish("把它放在桌面上");
    expect(placement.error).toBeUndefined();
    const zhPlaced = run(chinese, placement.text).world;
    expect(zhPlaced.held).toBe(enPlaced.held);
    expect(zhPlaced.objects).toEqual(enPlaced.objects);
  });

  it("executes generated Chinese query forms instead of only translating them", () => {
    const e = fresh();
    const ask = (input: string) => {
      const mapped = toEnglish(input);
      expect(mapped.error).toBeUndefined();
      return run(e, mapped.text).reply;
    };
    expect(ask("盒子里的蓝色积木在哪里")).toContain("in the box");
    expect(ask("桌上有几个绿色方块")).toMatch(/^\d+:/);
    expect(ask("什么支撑红色棱锥")).toContain("cube");
    expect(ask("有没有蓝色棱锥")).toMatch(/^Yes/);
    expect(ask("红色立方块比蓝色积木小吗")).toMatch(/^(?:Yes|No)\.$/);
  });

  it.each([
    ["I am holding the blue block.", "我正拿着蓝色积木。"],
    ["the blue block is in the box.", "蓝色积木在盒子里。"],
    ["the green pyramid is on the red cube.", "绿色棱锥位于红色立方块上。"],
    ["the red block is not supported.", "红色积木没有支撑物。"],
    ["nothing.", "没有物体。"],
  ])("localizes the reply %s", (reply, expected) => {
    expect(translateReply(reply)).toBe(expected);
  });
});
