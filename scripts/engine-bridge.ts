// Adapter kept separate from the unmodified Apache-2.0 upstream sources.
import { DOMParser } from "@xmldom/xmldom";
const MSX_COLOR_WHITE = "#ffffff";
function parseXML(text: string) {
  const document = new DOMParser().parseFromString(text, "text/xml");
  const visit = (node: any) => {
    if (node.nodeType === 1) {
      Object.defineProperty(node, "children", {
        get() {
          return Array.from(this.childNodes).filter(
            (x: any) => x.nodeType === 1,
          );
        },
      });
      const get = node.getAttribute.bind(node);
      node.getAttribute = (name: string) =>
        node.hasAttribute(name) ? get(name) : null;
    }
    for (const child of Array.from(node.childNodes || [])) visit(child);
  };
  visit(document);
  return document.documentElement;
}
export function createEngine(resources: Record<string, string>) {
  Sort.clear();
  ShrdluBlock.next_ID = 1;
  const ontology = new Ontology();
  ontology.loadSortsFromXML(parseXML(resources["shrdluontology.xml"]));
  const parser = NLParser.fromXML(
    parseXML(resources["nlpatternrules.xml"]),
    ontology,
  );
  const generator = new NLGenerator(ontology, parser.posParser);
  const world = new ShrdluBlocksWorld();
  let messages: string[] = [];
  const app = {
    addMessageWithColorTime(text: string) {
      messages.push(text.replace(/^shrdlu:\s*/i, ""));
    },
  };
  const ai = new BlocksWorldRuleBasedAI(
    ontology,
    parser,
    generator,
    world,
    app,
    1,
    0,
    DEFAULT_QUESTION_PATIENCE_TIMER,
    [],
  );
  ai.loadLongTermRulesFromXML(parseXML(resources["blocksworld-kb.xml"]));
  let time = 0;
  ai.update(time++);
  return {
    replaceWorld(state: any) {
      time = Math.max(time, state.time);
      for (const b of state.objects) {
        const target = world.getObject(b.ID);
        if (target) Object.assign(target, b);
      }
      world.objectInArm = state.held ? world.getObject(state.held) : null;
      ai.attentionAndPerception();
    },
    submit(text: string) {
      ai.perceiveTextInput("user", text, time);
    },
    step() {
      ai.update(time++);
      return ai.isIdle();
    },
    drain() {
      const result = messages;
      messages = [];
      return result;
    },
    snapshot() {
      return {
        objects: world.objects.map((o) => ({
          ID: o.ID,
          type: o.type,
          color: o.color,
          size: o.size,
          x: o.x,
          y: o.y,
          z: o.z,
          dx: o.dx,
          dy: o.dy,
          dz: o.dz,
        })),
        held: world.objectInArm?.ID ?? null,
        time,
        facts: ai.shortTermMemory?.plainTermList?.length ?? 0,
        action: ai.currentActionHandler?.ir?.action?.toString() ?? null,
      };
    },
  };
}
