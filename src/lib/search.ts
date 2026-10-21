/** Escapes user input for a PostgREST `ilike` filter inside `.or()`. */
export function ilikeTerm(q: string) {
  const cleaned = q.replace(/[%_\\(),."']/g, " ").trim().slice(0, 60);
  return cleaned ? `%${cleaned}%` : null;
}
