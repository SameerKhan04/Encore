import {
  createMemoryVoiceSession,
  shouldMuteIncomingVoice,
  shouldMuteLocalVoice,
  syncVoiceMuteFromGame,
  type VoiceSession,
} from '@/services/matchVoice';
import type { GameState, PlayerId } from '@/store/gameStore';

describe('shouldMuteLocalVoice', () => {
  it('mutes while the opponent is singing so you can hear them', () => {
    expect(
      shouldMuteLocalVoice({
        state: 'PLAYER_SINGING',
        localSeat: 'A',
        activePlayer: 'B',
      }),
    ).toBe(true);
  });

  it('stays unmuted while the local player is singing so the peer can hear', () => {
    expect(
      shouldMuteLocalVoice({
        state: 'PLAYER_SINGING',
        localSeat: 'A',
        activePlayer: 'A',
      }),
    ).toBe(false);
  });

  it('mutes the listener during opponent countdown and processing', () => {
    expect(
      shouldMuteLocalVoice({
        state: 'PLAYER_COUNTDOWN',
        localSeat: 'B',
        activePlayer: 'A',
      }),
    ).toBe(true);
    expect(
      shouldMuteLocalVoice({
        state: 'PROCESSING_AUDIO',
        localSeat: 'B',
        activePlayer: 'A',
      }),
    ).toBe(true);
  });

  it('keeps the singer unmuted during their countdown and processing', () => {
    expect(
      shouldMuteLocalVoice({
        state: 'PLAYER_COUNTDOWN',
        localSeat: 'A',
        activePlayer: 'A',
      }),
    ).toBe(false);
  });

  it('stays unmuted during think / lobby / word pick', () => {
    const cases: Array<{
      state: GameState;
      localSeat: PlayerId;
      activePlayer: PlayerId;
    }> = [
      { state: 'ROUND_START', localSeat: 'A', activePlayer: 'A' },
      { state: 'PLAYER_PREPARING', localSeat: 'A', activePlayer: 'A' },
      { state: 'WORD_SELECTION', localSeat: 'B', activePlayer: 'A' },
      { state: 'IDLE', localSeat: 'A', activePlayer: 'A' },
    ];
    for (const input of cases) {
      expect(shouldMuteLocalVoice(input)).toBe(false);
    }
  });
});

describe('shouldMuteIncomingVoice', () => {
  it('mutes incoming for the singer so they do not hear the opponent', () => {
    expect(
      shouldMuteIncomingVoice({
        state: 'PLAYER_SINGING',
        localSeat: 'A',
        activePlayer: 'A',
      }),
    ).toBe(true);
  });

  it('keeps incoming open for the listener so they hear the singer', () => {
    expect(
      shouldMuteIncomingVoice({
        state: 'PLAYER_SINGING',
        localSeat: 'B',
        activePlayer: 'A',
      }),
    ).toBe(false);
  });

  it('keeps duplex hearing between turns', () => {
    expect(
      shouldMuteIncomingVoice({
        state: 'PLAYER_PREPARING',
        localSeat: 'A',
        activePlayer: 'A',
      }),
    ).toBe(false);
  });
});

describe('memory voice session', () => {
  it('connects and tracks outgoing mute', async () => {
    const voice: VoiceSession = createMemoryVoiceSession();
    expect(voice.status).toBe('idle');

    await voice.connect({ matchId: 'm1', localPlayerId: 'host' });
    expect(voice.status).toBe('connected');
    expect(voice.outgoingMuted).toBe(false);

    voice.setOutgoingMuted(true);
    expect(voice.outgoingMuted).toBe(true);

    await voice.disconnect();
    expect(voice.status).toBe('idle');
  });

  it('syncVoiceMuteFromGame applies outgoing and incoming mute rules', async () => {
    const voice = createMemoryVoiceSession();
    await voice.connect({ matchId: 'm1', localPlayerId: 'host' });

    // Listener during opponent sing: mute mic, hear remote.
    syncVoiceMuteFromGame(voice, {
      state: 'PLAYER_SINGING',
      localSeat: 'A',
      activePlayer: 'B',
    });
    expect(voice.outgoingMuted).toBe(true);
    expect(voice.incomingMuted).toBe(false);

    // Singer: send audio, mute what they hear from opponent.
    syncVoiceMuteFromGame(voice, {
      state: 'PLAYER_SINGING',
      localSeat: 'A',
      activePlayer: 'A',
    });
    expect(voice.outgoingMuted).toBe(false);
    expect(voice.incomingMuted).toBe(true);
  });
});
