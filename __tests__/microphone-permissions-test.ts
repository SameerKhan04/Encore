import {
  ensureMicrophonePermission,
  type MicrophonePermissionDeps,
} from '@/services/microphonePermissions';

function createDeps(
  overrides: Partial<MicrophonePermissionDeps> = {},
): MicrophonePermissionDeps {
  return {
    getPermissionsAsync: jest.fn(async () => ({
      granted: false,
      status: 'undetermined' as const,
      canAskAgain: true,
    })),
    requestPermissionsAsync: jest.fn(async () => ({
      granted: true,
      status: 'granted' as const,
      canAskAgain: true,
    })),
    ...overrides,
  };
}

describe('ensureMicrophonePermission', () => {
  it('returns granted when permission is already granted', async () => {
    const deps = createDeps({
      getPermissionsAsync: jest.fn(async () => ({
        granted: true,
        status: 'granted' as const,
        canAskAgain: true,
      })),
    });

    await expect(ensureMicrophonePermission(deps)).resolves.toBe('granted');
    expect(deps.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permission when undetermined and returns the result', async () => {
    const deps = createDeps({
      requestPermissionsAsync: jest.fn(async () => ({
        granted: false,
        status: 'denied' as const,
        canAskAgain: false,
      })),
    });

    await expect(ensureMicrophonePermission(deps)).resolves.toBe('denied');
    expect(deps.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('returns denied without re-prompting when already denied and cannot ask again', async () => {
    const deps = createDeps({
      getPermissionsAsync: jest.fn(async () => ({
        granted: false,
        status: 'denied' as const,
        canAskAgain: false,
      })),
    });

    await expect(ensureMicrophonePermission(deps)).resolves.toBe('denied');
    expect(deps.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
