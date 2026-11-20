/**
 * Minimal HTML sanitizer for user-generated text that may contain pasted markup.
 * Keeps a small allowlist of inline tags; everything else is stripped.
 */
const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'code', 'br', 'span', 'a']);

export function sanitizeText(input: string): string {
  let out = input;
  // Remove script/style blocks entirely (content included).
  out = out.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // Strip comments.
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  // Disallowed tags: remove tag, keep inner text.
  out = out.replace(/<\s*\/?\s*([a-zA-Z0-9-]+)([^>]*)>/g, (match, tag: string) => {
    const t = tag.toLowerCase();
    if (ALLOWED_TAGS.has(t)) return match;
    return '';
  });
  // Strip on* handlers and javascript: urls from remaining tags.
  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/(href|src)\s*=\s*("|')?\s*javascript:[^"'>\s]*("|')?/gi, '$1="#"');
  return out;
}

/** Escape plain text for safe display (defense in depth when not using React text nodes). */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Extract @mentions from a comment body: sequences like @name or @email-local. */
export function extractMentions(body: string): string[] {
  const re = /@([a-zA-Z0-9._+-]{1,64})/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    found.add(m[1]!.toLowerCase());
  }
  return Array.from(found);
}
