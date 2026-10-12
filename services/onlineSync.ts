import type { MatchSnapshot } from '@/services/matchRoom';
import type { PlayerId } from '@/store/gameStore';

export type OnlineRole = 'host' | 'guest';

export function localSeatForRole(role: OnlineRole): PlayerId {
  return role === 'host' ? 'A' : 'B';
}

export function isLocalPlayersTurn(
  role: OnlineRole,
  activePlayer: PlayerId,
): boolean {
  return localSeatForRole(role) === activePlayer;
}

type SnapshotSource = {
  state: MatchSnapshot['gameState'];
  activePlayer: PlayerId;
  pickingPlayer: PlayerId | null;
  challengePhrase: string;
  transcriptWords: string[];
  scores: { A: number; B: number };
  thinkDeadlineAt: number | null;
  syncRevision: number;
};

export function readMatchSnapshot(game: SnapshotSource): MatchSnapshot {
  return {
    challengePhrase: game.challengePhrase,
    activePlayer: game.activePlayer,
    pickingPlayer: game.pickingPlayer,
    scores: { ...game.scores },
    gameState: game.state,
    transcriptWords: [...game.transcriptWords],
    thinkDeadlineAt: game.thinkDeadlineAt,
    revision: game.syncRevision,
  };
}

export function snapshotsDiffer(
  a: MatchSnapshot | null | undefined,
  b: MatchSnapshot | null | undefined,
): boolean {
  if (!a || !b) {
    return a !== b;
  }
  return a.revision !== b.revision;
}
