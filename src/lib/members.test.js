import { describe, it, expect } from 'vitest';
import { isContributedBy, matchUserByName, normName } from './members';

const users = [
  { uid: 'u1', displayName: 'Yogita Deshpande' },
  { uid: 'u2', displayName: 'Ramesh' },
  { uid: 'u3', displayName: 'ramesh ' },
];

describe('normName', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normName('  Yogita   Deshpande ')).toBe('yogita deshpande');
  });
});

describe('matchUserByName', () => {
  it('finds a unique match', () => {
    expect(matchUserByName('yogita  deshpande', users)?.uid).toBe('u1');
  });
  it('refuses ambiguous or missing names', () => {
    expect(matchUserByName('Ramesh', users)).toBeNull();
    expect(matchUserByName('Nobody', users)).toBeNull();
    expect(matchUserByName('', users)).toBeNull();
  });
});

describe('isContributedBy', () => {
  it('prefers contributorUid over the name', () => {
    const book = { contributor: 'Yogita Deshpande', contributorUid: 'someone-else' };
    expect(isContributedBy(book, users[0])).toBe(false);
  });
  it('falls back to name matching for unlinked books', () => {
    expect(isContributedBy({ contributor: 'yogita deshpande' }, users[0])).toBe(true);
    expect(isContributedBy({ contributor: '' }, users[0])).toBe(false);
  });
});
