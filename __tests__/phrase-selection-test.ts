import {
  getSelectedPhrase,
  phraseMultiplier,
  reducePhraseSelection,
  type PhraseSelection,
} from '@/services/phraseSelection';

const WORDS = [
  'I',
  'want',
  'to',
  'hold',
  'your',
  'hand',
  'forever',
  'and',
  'never',
  'let',
  'go',
  'tonight',
];

describe('phraseMultiplier', () => {
  it('maps word counts to the ENCORE multiplier table', () => {
    expect(phraseMultiplier(0)).toBe(0);
    expect(phraseMultiplier(1)).toBe(1);
    expect(phraseMultiplier(2)).toBe(2);
    expect(phraseMultiplier(3)).toBe(4);
    expect(phraseMultiplier(4)).toBe(6);
    expect(phraseMultiplier(5)).toBe(8);
    expect(phraseMultiplier(9)).toBe(8);
  });
});

describe('reducePhraseSelection', () => {
  it('selects the first tapped word', () => {
    const next = reducePhraseSelection(null, 3);
    expect(next).toEqual({ start: 3, end: 3 });
  });

  it('expands consecutively to the right', () => {
    let selection: PhraseSelection = { start: 3, end: 3 };
    selection = reducePhraseSelection(selection, 4);
    selection = reducePhraseSelection(selection, 5);
    expect(selection).toEqual({ start: 3, end: 5 });
  });

  it('expands consecutively to the left', () => {
    let selection: PhraseSelection = { start: 3, end: 3 };
    selection = reducePhraseSelection(selection, 2);
    expect(selection).toEqual({ start: 2, end: 3 });
  });

  it('rejects non-consecutive taps by starting a new selection', () => {
    const selection: PhraseSelection = { start: 3, end: 4 };
    expect(reducePhraseSelection(selection, 8)).toEqual({ start: 8, end: 8 });
  });

  it('clears when the only selected word is tapped again', () => {
    expect(reducePhraseSelection({ start: 2, end: 2 }, 2)).toBeNull();
  });

  it('shrinks from an endpoint when a boundary word is tapped', () => {
    expect(reducePhraseSelection({ start: 2, end: 5 }, 2)).toEqual({
      start: 3,
      end: 5,
    });
    expect(reducePhraseSelection({ start: 2, end: 5 }, 5)).toEqual({
      start: 2,
      end: 4,
    });
  });
});

describe('getSelectedPhrase', () => {
  it('joins the consecutive selected words', () => {
    expect(getSelectedPhrase(WORDS, { start: 3, end: 5 })).toBe(
      'hold your hand',
    );
  });

  it('returns empty string when nothing is selected', () => {
    expect(getSelectedPhrase(WORDS, null)).toBe('');
  });
});
