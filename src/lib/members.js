// Linking books to members. Books carry `contributor` (display text, from
// Excel) and, once linked, `contributorUid`. The uid is authoritative; the
// name match is only a fallback for books not linked yet.

export function normName(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isContributedBy(book, user) {
  if (!user) return false;
  if (book.contributorUid) return book.contributorUid === user.uid;
  return !!book.contributor && normName(book.contributor) === normName(user.displayName);
}

// Unique user whose displayName matches `name`; null if none or ambiguous.
export function matchUserByName(name, users) {
  const n = normName(name);
  if (!n) return null;
  const hits = users.filter((u) => normName(u.displayName) === n);
  return hits.length === 1 ? hits[0] : null;
}
