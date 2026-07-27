export interface JudgeScoreItem {
  point: string;
  quoteHe: string;
  skill?: string;
}

export interface JudgeMemoItem {
  text: string;
  skill: string;
  quoteHe: string;
}

export interface JudgeResult {
  scores: Record<string, number>;
  overall: number;
  passed: boolean;
  strengths: JudgeScoreItem[];
  weaknesses: JudgeScoreItem[];
  drills: string[];
  memos: JudgeMemoItem[];
}

import { JUDGE_SYSTEM_PROMPT, DEFAULT_RUBRIC, buildJudgeUserPrompt, RubricItem } from './prompts';
import { generateJson } from './llm';
import { computeMetrics, ObjectiveMetrics } from './metrics';

export async function runJudge(input: {
  transcript: { role: string; text: string }[];
  rubric?: RubricItem[];
  metrics?: ObjectiveMetrics;
  hiddenObjective: string;
}): Promise<JudgeResult> {
  const rubric = input.rubric || DEFAULT_RUBRIC;
  const metrics = input.metrics || computeMetrics(input.transcript);

  const userPrompt = buildJudgeUserPrompt({
    hiddenObjective: input.hiddenObjective,
    rubric,
    metrics: metrics as unknown as Record<string, number>,
    transcript: input.transcript,
  });

  const parsed = (await generateJson(JUDGE_SYSTEM_PROMPT, userPrompt)) as JudgeResult;
  return parsed;
}
