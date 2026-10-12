import { areLabRoutesEnabled } from '@/services/labRoutes';

describe('labRoutes', () => {
  it('enables lab routes only in development', () => {
    expect(areLabRoutesEnabled({ dev: true })).toBe(true);
    expect(areLabRoutesEnabled({ dev: false })).toBe(false);
  });
});
