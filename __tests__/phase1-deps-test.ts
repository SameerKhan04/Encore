import packageJson from '@/package.json';

describe('Phase 1 dependencies', () => {
  it('lists zustand for the game state machine', () => {
    expect(packageJson.dependencies.zustand).toBeDefined();
  });

  it('lists expo-audio for recording and playback', () => {
    expect(packageJson.dependencies['expo-audio']).toBeDefined();
  });

  it('lists expo-haptics for tactile feedback', () => {
    expect(packageJson.dependencies['expo-haptics']).toBeDefined();
  });

  it('lists react-native-reanimated for fluid transitions', () => {
    expect(packageJson.dependencies['react-native-reanimated']).toBeDefined();
  });

  it('uses expo-router as the app entry', () => {
    expect(packageJson.main).toBe('expo-router/entry');
  });
});
