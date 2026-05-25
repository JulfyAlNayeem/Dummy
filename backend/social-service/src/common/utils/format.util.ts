export function formatReactionCounts(reactions: Array<{ type: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of reactions) counts[r.type] = (counts[r.type] || 0) + 1;
  return counts;
}

export function formatPost(post: any) {
  if (!post) return post;
  const out: any = { ...post };
  if (Array.isArray(out.reactions)) out.reactions = formatReactionCounts(out.reactions);
  // Normalize the nested user's image field to avatar for frontend consumption
  if (out.user) out.user = { ...out.user, avatar: out.user.image ?? out.user.avatar ?? null };
  return out;
}
