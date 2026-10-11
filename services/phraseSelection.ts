export type PhraseSelection = {
  start: number;
  end: number;
} | null;

/** 1→1x, 2→2x, 3→4x, 4→6x, 5+→8x */
export function phraseMultiplier(wordCount: number): number {
  if (wordCount <= 0) return 0;
  if (wordCount === 1) return 1;
  if (wordCount === 2) return 2;
  if (wordCount === 3) return 4;
  if (wordCount === 4) return 6;
  return 8;
}

/**
 * Consecutive-only phrase selection.
 * Adjacent taps expand; non-adjacent taps start a new selection.
 */
export function reducePhraseSelection(
  selection: PhraseSelection,
  index: number,
): PhraseSelection {
  if (selection === null) {
    return { start: index, end: index };
  }

  const { start, end } = selection;

  if (index >= start && index <= end) {
    if (start === end) {
      return null;
    }
    if (index === start) {
      return { start: start + 1, end };
    }
    if (index === end) {
      return { start, end: end - 1 };
    }
    return selection;
  }

  if (index === start - 1) {
    return { start: index, end };
  }
  if (index === end + 1) {
    return { start, end: index };
  }

  return { start: index, end: index };
}

export function getSelectedPhrase(
  words: readonly string[],
  selection: PhraseSelection,
): string {
  if (!selection) {
    return '';
  }
  return words.slice(selection.start, selection.end + 1).join(' ');
}

export function getSelectionWordCount(selection: PhraseSelection): number {
  if (!selection) {
    return 0;
  }
  return selection.end - selection.start + 1;
}
