import {
  INVITE_CODE_LENGTH,
  generateInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from '@/services/inviteCode';

describe('normalizeInviteCode', () => {
  it('uppercases and strips separators', () => {
    expect(normalizeInviteCode(' ab-cd-ef ')).toBe('ABCDEF');
  });
});

describe('isValidInviteCode', () => {
  it('accepts normalized codes of the expected length', () => {
    expect(isValidInviteCode('AB23CD')).toBe(true);
  });

  it('rejects wrong length or empty input', () => {
    expect(isValidInviteCode('ABC')).toBe(false);
    expect(isValidInviteCode('')).toBe(false);
  });

  it('rejects ambiguous characters like 0 O 1 I', () => {
    expect(isValidInviteCode('AB0OID')).toBe(false);
  });
});

describe('generateInviteCode', () => {
  it('returns a valid code of fixed length', () => {
    const code = generateInviteCode(() => 0.1);
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(isValidInviteCode(code)).toBe(true);
  });
});
