import {
  createFileSystemKeyValueStorage,
  createMemoryKeyValueStorage,
  resolveAsyncStorage,
  unwrapStorageModule,
} from '@/services/asyncStorage';

describe('asyncStorage helpers', () => {
  it('creates a working memory key-value store', async () => {
    const storage = createMemoryKeyValueStorage();
    await storage.setItem('k', 'v');
    expect(await storage.getItem('k')).toBe('v');
    await storage.removeItem('k');
    expect(await storage.getItem('k')).toBeNull();
  });

  it('unwraps nested default exports to the storage API', () => {
    const api = {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
    expect(unwrapStorageModule({ default: { default: api } })).toBe(api);
  });

  it('file-system KV round-trips with an injected FS', async () => {
    const files = new Map<string, string>();
    const storage = createFileSystemKeyValueStorage({
      documentDirectory: 'file:///doc/',
      async getInfoAsync(uri) {
        if (uri.endsWith('/')) {
          return { exists: true, isDirectory: true };
        }
        return { exists: files.has(uri) };
      },
      async makeDirectoryAsync() {},
      async readAsStringAsync(uri) {
        const value = files.get(uri);
        if (value == null) {
          throw new Error('missing');
        }
        return value;
      },
      async writeAsStringAsync(uri, contents) {
        files.set(uri, contents);
      },
      async deleteAsync(uri) {
        files.delete(uri);
      },
    });

    expect(storage).not.toBeNull();
    await storage!.setItem('encore.profile.v1', '{"ok":true}');
    expect(await storage!.getItem('encore.profile.v1')).toBe('{"ok":true}');
    await storage!.removeItem('encore.profile.v1');
    expect(await storage!.getItem('encore.profile.v1')).toBeNull();
  });

  it('resolveAsyncStorage returns storage or null without throwing', () => {
    expect(() => resolveAsyncStorage()).not.toThrow();
  });
});
