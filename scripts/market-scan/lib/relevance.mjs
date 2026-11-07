// R4 relevance: Hebrew Maps items carry no category_ids, only localized category text, so
// relevance is a text rule per profession (config stage2.category_rules, copied byte-exact from
// the spec by apply-r12.mjs). No Hebrew literals in this file.
const norm = s => String(s ?? '').normalize('NFC').trim();

// title_terms = the profession's head terms + its `contains` stems + title_terms_extra (R4).
export function titleTerms(profession, run) {
  const rule = run.stage2.category_rules?.[profession.slug] ?? {};
  const extra = run.stage2.title_terms_extra?.[profession.slug] ?? [];
  return [...new Set([...(profession.terms ?? []), ...(rule.contains ?? []), ...extra].map(norm).filter(Boolean))];
}

function compiled(profession, run) {
  const rule = run.stage2.category_rules?.[profession.slug];
  if (!rule) return null;
  return {
    exact: new Set((rule.exact ?? []).map(norm)),
    contains: (rule.contains ?? []).map(norm),
    conditional: new Set((rule.conditional ?? []).map(norm)),
    exclude: (rule.exclude ?? []).map(norm),
    generic: new Set((run.stage2.generic_categories ?? []).map(norm)),
    terms: titleTerms(profession, run),
  };
}

// Which rule (if any) a single category text hits. `excluded` = carries a contains stem but also
// an exclude stem: known and rejected, so it is not an "unmatched" diagnostic.
function categoryHit(text, r) {
  if (r.exact.has(text)) return 'exact';
  const stem = r.contains.some(s => text.includes(s));
  if (stem) return r.exclude.some(x => text.includes(x)) ? 'excluded' : 'contains';
  if (r.conditional.has(text)) return 'conditional';
  if (r.generic.has(text)) return 'generic';
  return null;
}

// relevant(b) = not directory AND ( any category in exact
//   OR any category contains a `contains` stem and no `exclude` stem
//   OR (primary category in GENERIC or null) AND title contains a title_terms stem
//   OR any category in conditional AND title contains a title_terms stem )
// Returns { relevant, via, unmatched } - unmatched = category texts that hit no rule at all.
export function classifyRelevance(b, profession, run) {
  const r = compiled(profession, run);
  const cats = [b.category, ...(b.additional_categories ?? [])].map(norm).filter(Boolean);
  if (!r) return { relevant: b.is_directory_item !== true, via: 'no_rule', unmatched: [] };
  const hits = cats.map(c => [c, categoryHit(c, r)]);
  const unmatched = hits.filter(([, h]) => h === null).map(([c]) => c);
  if (b.is_directory_item === true) return { relevant: false, via: 'directory', unmatched };
  const title = norm(b.title);
  const titleHit = r.terms.some(t => title.includes(t));
  const primary = norm(b.category);
  let via = null;
  if (hits.some(([, h]) => h === 'exact')) via = 'exact';
  else if (hits.some(([, h]) => h === 'contains')) via = 'contains';
  else if ((!primary || r.generic.has(primary)) && titleHit) via = 'generic_title';
  else if (hits.some(([, h]) => h === 'conditional') && titleHit) via = 'conditional_title';
  return { relevant: via !== null, via, unmatched };
}

export const isRelevant = (b, profession, run) => classifyRelevance(b, profession, run).relevant;
