import GT from "@/components/GlossaryTerm";
import { GLOSSARY } from "@/data/glossary";

// Longest terms first so "Core Web Vitals" matches before "Core"
const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const PATTERN = new RegExp(
  `(${TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "g"
);

export function withGlossary(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? null;
  const parts = text.split(PATTERN);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    GLOSSARY[part] ? <GT key={i} term={part}>{part}</GT> : part
  );
}
