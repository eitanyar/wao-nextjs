import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const ASTRA_COPY_PATH = 'docs/copy/astra-authority-first-homepage-copy.json';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type CopyLeaf = { pointer: string; value: string | number | boolean | null };

function escapePointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function flattenAstraCopyLeaves(value: JsonValue, pointer = ''): CopyLeaf[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenAstraCopyLeaves(item, `${pointer}/${index}`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      flattenAstraCopyLeaves(item, `${pointer}/${escapePointerSegment(key)}`));
  }
  return [{ pointer, value: value as CopyLeaf['value'] }];
}

export async function loadAstraCopyReview(): Promise<{
  artifact: JsonValue;
  leaves: CopyLeaf[];
  sha256: string;
  path: string;
}> {
  const bytes = await readFile(join(process.cwd(), ASTRA_COPY_PATH));
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const artifact = JSON.parse(text) as JsonValue;
  return {
    artifact,
    leaves: flattenAstraCopyLeaves(artifact),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    path: ASTRA_COPY_PATH,
  };
}
