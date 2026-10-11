import { colors, spacing, typography, brand } from '@/constants/theme';

describe('theme tokens', () => {
  it('exposes the ENCORE brand name for hero-level UI', () => {
    expect(brand.name).toBe('ENCORE');
  });

  it('defines required color tokens for the shell', () => {
    expect(colors.background).toMatch(/^#/);
    expect(colors.surface).toMatch(/^#/);
    expect(colors.text).toMatch(/^#/);
    expect(colors.textMuted).toMatch(/^#/);
    expect(colors.accent).toMatch(/^#/);
    expect(colors.danger).toMatch(/^#/);
  });

  it('defines spacing scale used by layouts', () => {
    expect(spacing.xs).toBeLessThan(spacing.sm);
    expect(spacing.sm).toBeLessThan(spacing.md);
    expect(spacing.md).toBeLessThan(spacing.lg);
    expect(spacing.lg).toBeLessThan(spacing.xl);
  });

  it('defines typography sizes for brand and body', () => {
    expect(typography.brand).toBeGreaterThan(typography.title);
    expect(typography.title).toBeGreaterThan(typography.body);
    expect(typography.body).toBeGreaterThan(typography.caption);
  });
});
