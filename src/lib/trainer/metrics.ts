export interface ObjectiveMetrics {
  talkRatio: number;
  avgUserTurnChars: number;
  longestUserTurnChars: number;
  questionCount: number;
  questionRatio: number;
  fillerCount: number;
  fillerPer100Words: number;
}

const FILLER_WORDS = ['אה', 'אמ', 'כאילו', 'יעני', 'בקיצור', 'אתה יודע', 'וואלה'];

export function computeMetrics(transcript: { role: string; text: string }[]): ObjectiveMetrics {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return {
      talkRatio: 0,
      avgUserTurnChars: 0,
      longestUserTurnChars: 0,
      questionCount: 0,
      questionRatio: 0,
      fillerCount: 0,
      fillerPer100Words: 0,
    };
  }

  let totalChars = 0;
  let userChars = 0;
  let userTurnCount = 0;
  let longestUserTurnChars = 0;
  let questionCount = 0;
  let fillerCount = 0;
  let totalUserWords = 0;

  for (const turn of transcript) {
    const text = turn.text || "";
    const len = text.length;
    totalChars += len;

    if (turn.role === 'user') {
      userTurnCount++;
      userChars += len;
      if (len > longestUserTurnChars) {
        longestUserTurnChars = len;
      }

      if (text.includes('?')) {
        questionCount++;
      }

      // Word count for fillerPer100Words calculation
      const words = text.trim() ? text.trim().split(/\s+/) : [];
      totalUserWords += words.length;

      // Filler counts
      for (const filler of FILLER_WORDS) {
        if (filler.includes(' ')) {
          // Multi-word filler (e.g. 'אתה יודע')
          let idx = text.indexOf(filler);
          while (idx !== -1) {
            fillerCount++;
            idx = text.indexOf(filler, idx + filler.length);
          }
        } else {
          // Single-word filler — match as whole word or token substring if punctuation attached
          // Let's count occurrences safely using word boundaries or exact token matching
          for (const word of words) {
            // Strip common punctuation for matching
            const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()?«»"']/g, "");
            if (cleanWord === filler) {
              fillerCount++;
            }
          }
        }
      }
    }
  }

  const talkRatio = totalChars > 0 ? Number((userChars / totalChars).toFixed(3)) : 0;
  const avgUserTurnChars = userTurnCount > 0 ? Math.round(userChars / userTurnCount) : 0;
  const questionRatio = userTurnCount > 0 ? Number((questionCount / userTurnCount).toFixed(3)) : 0;

  const fillerPer100Words = totalUserWords > 0
    ? Number((fillerCount / (totalUserWords / 100)).toFixed(2))
    : 0;

  return {
    talkRatio,
    avgUserTurnChars,
    longestUserTurnChars,
    questionCount,
    questionRatio,
    fillerCount,
    fillerPer100Words,
  };
}
