import {
  createMemoryVoiceSignaling,
  type VoiceSignal,
} from '@/services/voiceSignaling';

describe('memory voice signaling', () => {
  it('delivers offer and answer between peers on the same match', async () => {
    const signaling = createMemoryVoiceSignaling();
    const received: VoiceSignal[] = [];

    const unsubscribe = signaling.subscribe('match-1', 'guest-1', (signal) => {
      received.push(signal);
    });

    await signaling.publish({
      matchId: 'match-1',
      fromPlayerId: 'host-1',
      type: 'offer',
      payload: { sdp: 'offer-sdp' },
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      type: 'offer',
      fromPlayerId: 'host-1',
      payload: { sdp: 'offer-sdp' },
    });

    await signaling.publish({
      matchId: 'match-1',
      fromPlayerId: 'guest-1',
      type: 'answer',
      payload: { sdp: 'answer-sdp' },
    });

    // Subscriber is guest — should not receive their own answer.
    expect(received).toHaveLength(1);

    unsubscribe();
  });

  it('delivers ICE candidates to the peer', async () => {
    const signaling = createMemoryVoiceSignaling();
    const received: VoiceSignal[] = [];
    signaling.subscribe('match-2', 'host-1', (signal) => {
      received.push(signal);
    });

    await signaling.publish({
      matchId: 'match-2',
      fromPlayerId: 'guest-1',
      type: 'ice',
      payload: { candidate: 'cand-1' },
    });

    expect(received[0]?.type).toBe('ice');
    expect(received[0]?.payload).toEqual({ candidate: 'cand-1' });
  });

  it('isolates signals by matchId', async () => {
    const signaling = createMemoryVoiceSignaling();
    const received: VoiceSignal[] = [];
    signaling.subscribe('match-a', 'host-1', (signal) => {
      received.push(signal);
    });

    await signaling.publish({
      matchId: 'match-b',
      fromPlayerId: 'guest-1',
      type: 'offer',
      payload: { sdp: 'other' },
    });

    expect(received).toHaveLength(0);
  });
});
