import { MAIN_TABS, colors } from '@/constants/theme';

describe('PDF design tokens', () => {
  it('exposes pink, purple, and gold from the Encore UI kit', () => {
    expect(colors.pink).toBe('#FF4D9A');
    expect(colors.purple).toBe('#9B5DE5');
    expect(colors.gold).toBe('#F5C542');
    expect(colors.accent).toBe(colors.gold);
    expect(colors.fab).toBe(colors.pink);
    expect(colors.background).toBe('#12081F');
    expect(colors.surface).toBe('#2A1545');
  });
});

describe('main tab navigation', () => {
  it('orders Home, Friends, Play (mic), Profile — Rank deferred for v1', () => {
    expect(MAIN_TABS.map((tab) => tab.key)).toEqual([
      'home',
      'friends',
      'play',
      'profile',
    ]);
    expect(MAIN_TABS.some((tab) => tab.key === 'rank')).toBe(false);
  });

  it('labels the center mic tab as Play', () => {
    const play = MAIN_TABS.find((tab) => tab.key === 'play');
    expect(play?.title).toBe('Play');
    expect(play?.route).toBe('play');
    expect(play?.isFab).toBe(true);
  });

  it('maps each tab to an Expo Router file route', () => {
    expect(MAIN_TABS.map((tab) => tab.route)).toEqual([
      'index',
      'friends',
      'play',
      'profile',
    ]);
  });
});
