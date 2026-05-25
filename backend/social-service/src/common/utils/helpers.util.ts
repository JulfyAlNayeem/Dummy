/** Extract hashtag names (without #) from post content. */
export function extractHashtags(content: string): string[] {
  const matches = content.match(/#[\w\u0600-\u06FF]+/g) ?? [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

/** Slugify a string for page slugs. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .substring(0, 80);
}
