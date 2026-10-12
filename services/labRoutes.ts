/** Dev-only lab screens (audio-lab, debug-game) stay out of store builds. */
export function areLabRoutesEnabled(
  env: { dev?: boolean } = { dev: __DEV__ },
): boolean {
  return Boolean(env.dev);
}
