// Static review page: one player for the episode, then only the flagged lines/words,
// each with its episode timestamp (click to seek) and the cropped clip inline.

import path from "node:path";
import { judgmentFails } from "./core.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;

function seek(t) {
  return `<a href="#" class="ts" onclick="var p=document.getElementById('ep');p.currentTime=${t.toFixed(2)};p.play();return false">${fmt(t)}</a>`;
}

export function renderReviewHtml({ title, episodeFile, total, lines, outDir, judgeMode }) {
  const rel = (f) => esc(path.relative(outDir, f));
  const rows = [];
  for (const l of lines) {
    const a = l.audio;
    const s1 = [];
    for (const x of l.ambiguous ?? []) s1.push(`<li>ambiguous: <b dir="rtl">${esc(x.word)}</b> want <code>${esc(x.intended?.translit)}</code>, risk <code>${esc(x.wrong.map((w) => w.translit).join(" / "))}</code>${x.candidate_niqqud ? ` &middot; candidate <span dir="rtl">${esc(x.candidate_niqqud.value)}</span> <em>UNVERIFIED</em>` : ""}</li>`);
    if (l.eyesClosed?.pass === false) s1.push(`<li>eyes-closed FAIL: ${esc(l.eyesClosed.reason)}</li>`);
    for (const w of l.oddWording ?? []) s1.push(`<li>odd: <span dir="rtl">${esc(w.phrase)}</span> &ndash; ${esc(w.why)}</li>`);
    for (const f of (l.lint ?? []).filter((x) => x.level === "flag")) s1.push(`<li>lint: <span dir="rtl">${esc(f.token)}</span> (${esc(f.reason)})</li>`);
    const s2 = [];
    if (a) {
      for (const f of a.flags) {
        const t = f.span ? a.offset + f.span.start : a.offset;
        const clip = f.clip ? `<audio controls preload="none" src="${rel(f.clip)}"></audio>` : "";
        if (f.type === "stt") s2.push(`<li>${seek(t)} STT <b>${esc(f.kind)}</b>: expected <span dir="rtl">${esc(f.expected)}</span> heard <span dir="rtl">${esc(f.heard)}</span> ${clip}</li>`);
        else s2.push(`<li>${seek(t)} pronunciation <b dir="rtl">${esc(f.label)}</b>: judge=${esc(f.verdict)} (${esc(f.confidence)}) heard <code>${esc(f.heard)}</code>, want <code>${esc(f.intended)}</code> ${clip}</li>`);
      }
    }
    const hasAudioFlag = a && (a.needsHuman || a.flags.length);
    if (!s1.length && !hasAudioFlag) continue;
    const reasons = a ? Object.entries(a.reasons).filter(([, r]) => r.length).map(([k, r]) => `take ${k}: ${esc(r.join("; "))}`).join("<br>") : "";
    rows.push(`<section class="${a?.needsHuman ? "human" : ""}">
<h3>${a ? seek(a.offset) + " " : ""}${esc(l.id)} ${a?.needsHuman ? '<span class="tag">NEEDS HUMAN</span>' : ""}</h3>
<p dir="rtl" class="line">${esc(l.voice)}</p>
${a ? `<p class="meta">picked take ${a.picked} of ${a.takes.length}${reasons ? `<br>${reasons}` : ""}</p>` : ""}
${s2.length ? `<ul>${s2.join("\n")}</ul>` : ""}
${s1.length ? `<details${a ? "" : " open"}><summary>text check (${s1.length})</summary><ul>${s1.join("\n")}</ul></details>` : ""}
</section>`);
  }
  const judged = lines.flatMap((l) => l.audio?.takes.find((t) => t.take === l.audio.picked)?.judgments ?? []);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:900px;margin:2em auto;padding:0 1em;color:#222}
section{border:1px solid #ddd;border-radius:6px;padding:.6em 1em;margin:1em 0}
section.human{border-color:#c33;background:#fff6f6}
.tag{background:#c33;color:#fff;font-size:.75em;padding:.1em .4em;border-radius:3px}
.line{font-size:1.2em}.meta{color:#666;font-size:.9em}
.ts{font-family:monospace}audio{vertical-align:middle;height:28px}li{margin:.4em 0}
</style></head><body>
<h1>${esc(title)}</h1>
<audio id="ep" controls src="${esc(episodeFile)}" style="width:100%;height:40px"></audio>
<p class="meta">${fmt(total)} total &middot; ${lines.length} lines &middot; ${rows.length} flagged &middot; ${judged.filter(judgmentFails).length}/${judged.length} pronunciation checks flagged on picked takes &middot; audio judge: ${esc(judgeMode)}${judgeMode === "advisory" ? " (pronunciation verdicts are hints and do not block take picking)" : ""}. STT cannot see homograph errors; listen to every flagged word.</p>
${rows.length ? rows.join("\n") : "<p>No flagged lines.</p>"}
</body></html>
`;
}
