import React, { Fragment } from 'react';

/**
 * Wraps Latin runs (and pure-Latin bracket/parentheses groups) in <bdi dir="ltr">
 * to preserve their LTR layout context within RTL paragraphs.
 */
export function renderMixed(text: string): React.ReactNode {
  if (!text) return null;
  const segments: React.ReactNode[] = [];
  
  // Regular expression to identify:
  // 1. Full URLs (http://... or https://...)
  // 2. Relative paths starting with /
  // 3. Latin brackets/parens groups with at least one alphanumeric character
  // 4. Maximal runs of Latin characters/digits/symbols
  // 5. Standalone brackets
  const re =
    /(https?:\/\/[^\s<>]*|\/[A-Za-z][A-Za-z0-9\-_.]*(?:\/[A-Za-z0-9\-_.]*)*\/?|[([{][^()[\]{}֐-׿]*[A-Za-z0-9][^()[\]{}֐-׿]*[)\]}]|\.?[A-Za-z][A-Za-z0-9\-\/='"{}]*(?:\.(?=[A-Za-z0-9'])[A-Za-z0-9\-\/='"{}]*)*(?:[,]?[ ]+\.?[A-Za-z][A-Za-z0-9\-\/='"{}]*(?:\.(?=[A-Za-z0-9'])[A-Za-z0-9\-\/='"{}]*)*)*|[[\]{}])/g;
    
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      segments.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>);
    }
    segments.push(<bdi key={key++} dir="ltr">{match[0]}</bdi>);
    last = re.lastIndex;
  }
  
  if (last < text.length) {
    segments.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }
  
  return <>{segments}</>;
}
