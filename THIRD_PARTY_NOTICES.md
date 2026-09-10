# Third-party notices

## SHRDLU TypeScript language engine

Source: https://github.com/santiontanon/SHRDLU

Author: Santi Ontañón and upstream contributors.

Pinned revision: `d20bff36486bce7853c11df1e194c7748a92ef19`.

License: Apache License 2.0, reproduced in `vendor/shrdlu/LICENSE`.

Included materials: selected TypeScript sources in `vendor/shrdlu/src` and the ontology, NLP rules, and blocks-world knowledge base in `public/engine`. The new application does not include the upstream adventure game's artwork, music, or maps.

Local source modification: `vendor/shrdlu/src/blocksworld/BlocksWorldRuleBasedAI.ts` retains `completedActionHandler` before clearing `currentActionHandler` at the end of a continuous action. This prevents dereferencing the cleared handler when checking intention success. All other original engine sources are kept in their upstream form. The XML/ESM adapter, controlled Chinese conversion, grounded interpreter, React UI, and Three.js renderer are new work.

## Historical SHRDLU dialogue

The 43-turn historical dialogue and its supplied Chinese translation were transcribed from the user's local reference material. Original system and dialogue: Terry Winograd. The two GIF images in `public/archive` are extracted from the same user-supplied archival webpage: the original screen display and the later University of Utah color rendering. They are shown with source attribution on the background page. Source: https://hci.stanford.edu/winograd/shrdlu/ . The transcript is presented as attributed historical reference; no license for the original MacLisp program is implied by the separate TypeScript engine's Apache license.

## Interface dependencies

React, Vite, TypeScript, Tailwind CSS, Base UI, Three.js, Lucide, xmldom, esbuild, and Vitest retain their respective licenses in their package distributions. Package versions and integrity hashes are recorded in `pnpm-lock.yaml`.

`react-bottom-fixed` 0.2.0 by almond-bongbong is used for the iOS input dock under the MIT license. Source: https://github.com/almond-bongbong/react-bottom-fixed . Integration changes are confined to the application's wrapper and CSS; the installed package source is unchanged.
