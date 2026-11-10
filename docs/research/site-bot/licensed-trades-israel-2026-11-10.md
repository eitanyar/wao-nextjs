# Israeli licensed trades for the Site-Bot credentials step (Yonatan, 2026-11-10)

Licence-question research for the Site-Bot credentials step. All sources checked 2026-11-10, read-only, no files edited. "V" means I confirmed it on a web source this session. "S" means the statute is well known but I did not re-fetch its text this session; check those before any copy states the law.

| Trade | Licence req. | Law / authority | Source | Ask licence Q | Alternative credential |
|---|---|---|---|---|---|
| Electrician | Y (graded: practical, certified, master, technician/engineer) | Electricity Law 1954 and Licences Regs; Labour Ministry electrician licensing unit (V) | gov.il/he/departments/units/electricity-licensing-unit | Y (ask the grade) | — |
| Gas technician (LPG) | Y | Gas (Safety & Licensing) Law 1989; Fuel & Gas Admin, Energy Ministry (V) | gov.il/he/service/lpg_licensing_permits_and_inspection | Y | — |
| Building/renovation contractor | Partial (only "registered contractor" for building-engineering works; a small renovator can trade without it) | Contractors Registration Law 1969; Contractors Registrar, Housing Ministry (V) | gov.il/he/departments/Units/contractors_registrar_and_head_of_sales_laws_moch | Y, worded "registered contractor?" | Insurance, years in trade |
| Pest control | Y (4 licence types) | Sanitary Pest Control regime, Environmental Protection Ministry (V) | gov.il/he/service/exterminator_license_renewal | Y | — |
| AC / refrigeration | Partial (mounting the unit needs no licence; electrical hookup needs an electrician; a Labour Ministry refrigeration certificate is a de-facto industry norm) | Electricity Law; IIOSH booklet Dec 2023 (V) | osh.org.il/UploadFiles/01_2024/G55.pdf | N | "Certified refrigeration technician" or electrician licence |
| Plumber | N (open trade; plumbing-contractor registration is optional) | d.co.il FAQ; Ynet (V, sources conflict) | d.co.il/faq-article10835/ | N | Certified course, insurance |
| Locksmith | N (no statute found; "police approval" claims are disputed, possibly just a good-conduct certificate) | midrag vs d.co.il (V, conflicting) | d.co.il/Article26/ | N | Insurance, ID/ownership-check policy. Avoid "police approval" (unverifiable) |
| Physician / dentist / medical injectables | Y (Botox/fillers by doctors only; dentists in limited areas) | Physicians Ordinance; MOH warning Sept 2024 (V) | bizportal.co.il/financialconsumerism/news/article/20042213 | Y | — |
| Cosmetician / laser / beauty / hair / nails | N | none found | same MOH coverage (V) | N | Course diploma, years, hygiene |
| Lawyer / notary | Y | Bar Association Law 1961 (S) | — | Y | — |
| CPA / tax representative | Y | CPA Law 1955; Tax Consultants Law 2005 (V, Knesset text) | fs.knesset.gov.il/16/law/16_lsr_299750.pdf | Y | — |
| Insurance agent / investment adviser | Y | Capital Market Authority; ISA (S) | — | Y | — |
| Real-estate agent | Y (annual licence, Ministry of Justice registrar) | Real Estate Brokers Law 1996 (V, secondary sources) | nadlancenter.co.il/article/3408 | Y | — |
| Psychologist | Y | Psychologists Law 1977, MOH (V, secondary sources) | hamichlol.org.il/חוק_הפסיכולוגים | Y | — |
| Dietitian | Y (protected title) | Health Professions Regulation Law 2008, MOH (V) | gov.il/BlobFolder/guide/licensing-medical-nutrition/... | Y | — |
| Social worker | Y | Social Workers Law 1996 (S) | — | Y | — |
| Driving instructor | Y | Transport Ministry (S; gov.il search did not surface the page) | — | Y | — |
| Fitness trainer (gym) | Partial (a Sports Law certificate is needed to instruct in a gym; personal training is outside the law) | Sports Law; Wingate syllabus 2025 (V) | wincol.ac.il/media/2025/07/... | N | "Certified instructor (Wingate)" |
| Movers | Partial (carrier licence for goods transport, scope for home moves unconfirmed) | Transport Services Law 1997 (V, partly) | gov.il/BlobFolder/dynamiccollectorresultitem/procedure_for_submitting/... | N | Goods-in-transit insurance |
| Coach, therapist, tutor, photographer, DJ, gardener, carpenter, painter | N | — | — | N | Portfolio, years |

**Mapping to the code:** do NOT gate on `VerticalKey`. Each vertical mixes licensed and unlicensed trades:
- `emergency-trades` holds both electrician and plumber/locksmith.
- `medical-aesthetics` holds both doctor and `מכון יופי`.
- `remote-professional` holds both psychologist and coach/tutor.

So gate on a niche-keyword list matched against `businessNiche`, the same `includes()` approach as `VERTICAL_MAP` in `/home/eitanya/wao/src/lib/lp/verticalDetect.ts`.

**Detection gaps** (trades `verticalDetect.ts` doesn't recognise yet):
- **Gas technician:** no `גז` keyword, so it falls back to `skilled-trades`.
- **Contractor:** no `קבלן`.
- **Real-estate agent:** no `מתווך` / `נדל"ן` / `תיווך`.
- **Driving instructor:** `מורה נהיגה` is caught by `מורה` and lands in `remote-professional`.

**Substring traps:** match the long forms only, and run the exclusions before the licensed list.
- Use `חשמלאי`, not bare `חשמל`, which also matches appliance shops.
- Exclude `מאמן אישי` and `מטפל` (never ask).
- Exclude `קוסמטיק`, `לייזר`, `פילינג`, `מכון יופי`, `אנטי אייג` (never ask).

Recommended `LICENSED_TRADES`, as keywords on `businessNiche`:
- **Already in the map:** `חשמלאי`, `מדביר`, `הדבר`, `רופא`, `שיניים`, `דרמטולוג`, `בוטוקס`, `עורך דין`, `עו"ד`, `נוטריון`, `רואה חשבון`, `יועץ מס`, `ביטוח`, `השקעות`, `פסיכולוג`, `פסיכותרפיסט`, `תזונאי`, `דיאטן`, `עו"ס`.
- **Add to both the licence list and `VERTICAL_MAP`:** `טכנאי גז` / `גז` (to `emergency-trades`), `קבלן` (to `skilled-trades`, worded as "registered contractor"), `מתווך` / `תיווך` (to `legal-financial`), `מורה נהיגה` (placed before `מורה`).
- **Never ask:** plumber, locksmith, AC, renovator (unless `קבלן`), beauty, fitness, coaching, events, gardening.

**Handoffs:**
- **Copywriter (Tamar):** the question wording and the per-trade alternative-credential prompt. For electricians it should ask the grade, not yes/no.
- **nextjs-engineer:** the keyword list and the `VERTICAL_MAP` additions, which need tests for the substring traps.
- **Noa:** gate the Hebrew copy.
- **Lior/Adam:** check the "S" rows before any copy cites the law.
