/**
 * Site Bot step 2c fix (Yonatan C3, 2026-11-25): the type check of the model-extracted interview facts, run right after
 * factsFromModel (interviewFactsFlow.extractSet), so the confirm-facts screen already shows the corrected type.
 *
 *   (i)  A `job` needs at least one content word beyond place and time words (the work or the problem). A job of only
 *        place + time words is retyped `local` when it names at least one place and every place it names is one of his
 *        service areas; otherwise it is dropped.
 *   (ii) An answer to the `callerQuestion` question is never a `job`: it is retyped `local` under the same place rule, else
 *        dropped. (A dedicated "caller question" type is NOT added here: flagged for step 3's fact ledger.)
 * A retype that duplicates an existing fact (same type + quote) is dropped. Ids are kept (gaps are fine).
 *
 * Pure. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { hasWorkContent } from './firstScreenFact';
import type { InterviewFact } from './interviewFacts';
import { localitiesNamedIn, type Locality } from './servedAreas';

export interface FactRetypeContext {
  localities: readonly Locality[];
  /** The owner's service-area texts (base city, his stated cities, the listed served areas). */
  serviceAreaTexts: readonly string[];
}

/** Every place the text names is one of the service areas (and it names at least one). */
function placesAllInAreas(text: string, context: FactRetypeContext): boolean {
  const named = localitiesNamedIn(text, context.localities);
  if (!named.length) return false;
  const areas = new Set(context.serviceAreaTexts.flatMap(area => localitiesNamedIn(area, context.localities)).map(place => place.slug));
  return named.every(place => areas.has(place.slug));
}

function factText(fact: InterviewFact): string {
  return `${fact.quote} ${fact.condition ?? ''}`.trim();
}

/** The model facts after rules (i) and (ii) (see the header). Non-job facts pass unchanged. */
export function retypeModelFacts(facts: readonly InterviewFact[], context: FactRetypeContext): InterviewFact[] {
  const seen = new Set(facts.filter(fact => fact.type !== 'job').map(fact => `${fact.type}\u0000${fact.quote}`));
  const out: InterviewFact[] = [];
  for (const fact of facts) {
    if (fact.type !== 'job') { out.push(fact); continue; }
    const callerQuestion = fact.source.kind === 'answer' && fact.source.questionKey === 'callerQuestion';
    if (!callerQuestion && hasWorkContent(fact.quote, context.localities)) { out.push(fact); continue; }
    if (!placesAllInAreas(factText(fact), context)) continue;
    const key = `local\u0000${fact.quote}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...fact, type: 'local' });
  }
  return out;
}
