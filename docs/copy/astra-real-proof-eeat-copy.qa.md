Astra Real-Proof Copy Bundle — Hebrew QA

Review date: 2026-09-24
Source: docs/copy/astra-real-proof-eeat-copy.json
Parent task: t_cbe46987 (formally completed)
Parent-reported SHA-256: 023c1996976c4a93de338976e70a358d65211a9aa93689c9e8786f56afd5880c
SHA-256 before review: 023c1996976c4a93de338976e70a358d65211a9aa93689c9e8786f56afd5880c
SHA-256 after review: 023c1996976c4a93de338976e70a358d65211a9aa93689c9e8786f56afd5880c
Source mutation: none; the before and after hashes match the completed parent evidence.

Coverage

Reviewed every string in metadata, hero_owner, video_proof, decision_guide, partner_proof, accountable_review, and accessibility. The review covered natural Israeli Hebrew, singular-male visitor address, short TTS-safe flow, the exactly-two-path distinction, video/source claim boundaries, consent and fallback labels, image and iframe accessibility labels, Partner status and non-endorsement language, Eitan accountability claims, and every required destination.

Material findings

1. Unsupported universal review claim

JSON path: accountable_review.lines[0]

The current sentence promises that every deliverable receives professional human review before the visitor sees it. The accepted evidence proves Eitan's identity and accountable professional-review role, but does not prove this universal process guarantee.

Replace byte-exact string:

Old: "כל תוצר עובר בדיקה אנושית מקצועית לפני שאתה רואה אותו."
New: "איתן יריב מוביל את הבדיקה המקצועית של העבודה."

2. Unnatural and confusing contact instruction

JSON path: decision_guide.unsure_prompt.line

"דבר איתנו בשאלה" is not natural Israeli Hebrew and weakens the key recovery instruction for a visitor who cannot choose a path.

Replace byte-exact string:

Old: "לא בטוח מה מתאים לך עכשיו? השווה בין שני הצרכים ודבר איתנו בשאלה. נעזור לך לבחור כיוון, בלי התחייבות."
New: "לא בטוח מה מתאים לך עכשיו? השווה בין שני הצרכים ודבר איתנו. נעזור לך לבחור כיוון, בלי התחייבות."

3. Machine-translated Partner coverage wording

JSON path: partner_proof.coverage_line

"כיסוי הסמכות" is not natural or sufficiently clear Hebrew for the verified Search and Display certification fact.

Replace byte-exact string:

Old: "מופיע בה כיסוי הסמכות לחיפוש (Search) ולתצוגה (Display)."
New: "הספרייה מציגה הסמכות בתחומי החיפוש (Search) והתצוגה (Display)."

No other material issue was found. The video copy does not invent a quotation, identity, transcript, result, ranking, lead, revenue, or recommendation detail. The Partner copy uses the exact verified directory destination, limits the claim to Partner status and Search/Display coverage, and states both non-endorsement and no-performance boundaries. The two primary paths and all supporting destinations remain correctly distinguished, with contact presented only as help choosing between them.

Founder spot-check boundary

Eitan must still perform the final founder-facing Hebrew and source-use spot-check before publication. This QA does not approve the unseen video's people, permissions, statements, or results, and release health remains false pending corrected copy, engineering, independent runtime/visual verification, and that founder spot-check.

OVERALL: REVISE
