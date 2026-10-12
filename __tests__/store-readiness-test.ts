import appJson from '@/app.json';
import easJson from '@/eas.json';
import {
  getStoreReadinessIssues,
  isStoreReadyForPlay,
} from '@/services/storeReadiness';

describe('Play Store readiness', () => {
  it('requires an Android applicationId / package', () => {
    const issues = getStoreReadinessIssues(appJson, easJson);
    expect(issues.some((issue) => /android package/i.test(issue))).toBe(false);
    expect(appJson.expo.android?.package).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i);
  });

  it('requires a numeric android.versionCode', () => {
    expect(typeof appJson.expo.android?.versionCode).toBe('number');
    expect(appJson.expo.android?.versionCode).toBeGreaterThan(0);
  });

  it('defines EAS development, preview, and production profiles', () => {
    expect(easJson.build.development).toBeDefined();
    expect(easJson.build.preview).toBeDefined();
    expect(easJson.build.production).toBeDefined();
    expect(easJson.build.development.developmentClient).toBe(true);
    expect(easJson.build.production.android?.buildType ?? 'app-bundle').toMatch(
      /app-bundle|apk/i,
    );
  });

  it('defines an Android submit profile for Play Store', () => {
    expect(easJson.submit?.production?.android).toBeDefined();
  });

  it('reports ready when config is complete', () => {
    expect(getStoreReadinessIssues(appJson, easJson)).toEqual([]);
    expect(isStoreReadyForPlay(appJson, easJson)).toBe(true);
  });

  it('flags missing package and profiles on incomplete config', () => {
    const issues = getStoreReadinessIssues(
      { expo: { version: '1.0.0', android: {} } },
      { build: {} },
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(isStoreReadyForPlay({ expo: { android: {} } }, { build: {} })).toBe(
      false,
    );
  });
});
