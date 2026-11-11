// Shape of a legal document generated from an approved md source (see scripts/build-site-bot-terms.mjs).
// HEBREW-SAFETY: types only, zero Hebrew bytes.

/** A run of inline text; `bold` marks a **...** run in the source. */
export interface LegalInline {
  text: string;
  bold?: boolean;
}

export type LegalBlock =
  | { type: "p"; inlines: LegalInline[] }
  | { type: "ul"; items: LegalInline[][] }
  | { type: "table"; header: LegalInline[][]; rows: LegalInline[][][] };

export interface LegalSection {
  /** "section-N", from the heading's leading number. */
  id: string;
  /** The ### heading text, byte-exact. */
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  /** The "# " heading text, byte-exact; also the page's metadata title. */
  title: string;
  /** Blocks between the title and the first section (the "last updated" line). */
  intro: LegalBlock[];
  sections: LegalSection[];
}
