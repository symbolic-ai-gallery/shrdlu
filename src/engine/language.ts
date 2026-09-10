const lexicalAliases: Array<[RegExp, string]> = [
  [/\b(?:brick|cuboid)s?\b/g, "block"],
  [/\b(?:crate|container)s?\b/g, "box"],
  [/\b(?:desk|workbench|work surface)s?\b/g, "table"],
  [/\bitems?\b/g, "object"],
  [/\b(?:huge|large-sized)\b/g, "big"],
  [/\b(?:tiny|small-sized)\b/g, "small"],
  [/\blarger\b/g, "bigger"],
  [/\bhigher\b/g, "taller"],
  [/\blower\b/g, "shorter"],
  [/\b(?:uncovered|free)\b/g, "clear"],
  [/\b(?:scarlet|crimson)\b/g, "red"],
  [/\bemerald\b/g, "green"],
  [/\bazure\b/g, "blue"],
  [/\bwithin\b/g, "inside"],
  [/\batop\b/g, "on top of"],
];

/** Normalize surface English without changing its intended blocks-world meaning. */
export function normalizeEnglish(input: string): string {
  let value = input
    .normalize("NFKC")
    .replace(/[’]/g, "'")
    .toLowerCase()
    .replace(/\bwhat's\b/g, "what is")
    .replace(/\bwhere's\b/g, "where is")
    .replace(/\bthere's\b/g, "there is")
    .replace(/\bthat's\b/g, "that is")
    .replace(/[“”"?.!,;:]/g, " ");
  for (const [pattern, replacement] of lexicalAliases)
    value = value.replace(pattern, replacement);
  return value.replace(/\s+/g, " ").trim();
}

/** Remove common politeness wrappers so the intent parser sees the command. */
export function stripEnglishPoliteness(input: string): string {
  let value = normalizeEnglish(input);
  const wrappers = [
    /^please\s+(?:can|could|would|will)\s+you\s+/,
    /^(?:can|could|would|will)\s+you(?:\s+please)?\s+/,
    /^(?:please|kindly)\s+/,
    /^(?:i would like|i'd like|i want)\s+you\s+to\s+/,
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const wrapper of wrappers) {
      const next = value.replace(wrapper, "");
      if (next !== value) {
        value = next;
        changed = true;
      }
    }
  }
  return value;
}
