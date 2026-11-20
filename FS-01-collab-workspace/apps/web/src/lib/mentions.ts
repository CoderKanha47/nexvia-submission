export interface MentionToken {
  type: 'text' | 'mention';
  text: string;
  userId?: string;
  name?: string;
}

const MENTION_RE = /@\[([^\]]+)\]\(([a-zA-Z0-9_-]+)\)/g;

export function extractMentionIds(body: string): string[] {
  const ids = new Set<string>();
  for (const match of body.matchAll(MENTION_RE)) {
    if (match[2]) ids.add(match[2]);
  }
  return [...ids];
}

/** Split a comment body into plain-text and mention tokens for rendering. */
export function tokenizeBody(body: string): MentionToken[] {
  const tokens: MentionToken[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION_RE)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ type: 'text', text: body.slice(last, index) });
    tokens.push({ type: 'mention', text: `@${match[1]}`, name: match[1], userId: match[2] });
    last = index + match[0].length;
  }
  if (last < body.length) tokens.push({ type: 'text', text: body.slice(last) });
  return tokens;
}

export function insertMention(bodyBefore: string, caret: number, name: string, userId: string): {
  body: string;
  caret: number;
} {
  // Replace the trailing "@query" (or "@") before the caret with the mention token.
  const before = bodyBefore.slice(0, caret);
  const atMatch = /@([\w.-]*)$/.exec(before);
  const start = atMatch ? caret - atMatch[0].length : caret;
  const token = `@[${name}](${userId}) `;
  return {
    body: bodyBefore.slice(0, start) + token + bodyBefore.slice(caret),
    caret: start + token.length,
  };
}

/** The current "@query" fragment before the caret, if any. */
export function currentMentionQuery(body: string, caret: number): string | null {
  const before = body.slice(0, caret);
  const m = /@([\w.-]*)$/.exec(before);
  return m ? m[1] : null;
}
