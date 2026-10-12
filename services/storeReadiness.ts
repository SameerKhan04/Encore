type AppConfig = {
  expo?: {
    version?: string;
    android?: {
      package?: string;
      versionCode?: number;
      permissions?: string[];
    };
  };
};

type EasConfig = {
  build?: {
    development?: { developmentClient?: boolean };
    preview?: unknown;
    production?: { android?: { buildType?: string } };
  };
  submit?: {
    production?: {
      android?: unknown;
    };
  };
};

const PACKAGE_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;

/** Returns human-readable gaps that block a Play Store .aab ship. */
export function getStoreReadinessIssues(
  appJson: AppConfig,
  easJson: EasConfig,
): string[] {
  const issues: string[] = [];
  const android = appJson.expo?.android;
  const packageName = android?.package;

  if (!packageName || !PACKAGE_PATTERN.test(packageName)) {
    issues.push('Android package (applicationId) is missing or invalid');
  }

  if (typeof android?.versionCode !== 'number' || android.versionCode < 1) {
    issues.push('android.versionCode must be a positive number');
  }

  if (!appJson.expo?.version) {
    issues.push('expo.version is missing');
  }

  if (!easJson.build?.development?.developmentClient) {
    issues.push('eas.json needs a development profile with developmentClient');
  }
  if (!easJson.build?.preview) {
    issues.push('eas.json needs a preview profile');
  }
  if (!easJson.build?.production) {
    issues.push('eas.json needs a production profile');
  }

  const productionBuildType = easJson.build?.production?.android?.buildType;
  if (productionBuildType === 'apk') {
    issues.push('production android.buildType must be app-bundle (default) for Play');
  }

  if (!easJson.submit?.production?.android) {
    issues.push('eas.json needs submit.production.android for Play Store uploads');
  }

  return issues;
}

export function isStoreReadyForPlay(
  appJson: AppConfig,
  easJson: EasConfig,
): boolean {
  return getStoreReadinessIssues(appJson, easJson).length === 0;
}
