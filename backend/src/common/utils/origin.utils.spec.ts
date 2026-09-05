import { isAllowedOrigin } from './origin.utils';

describe('isAllowedOrigin', () => {
  it('allows only explicitly configured origins in production', () => {
    expect(
      isAllowedOrigin(
        'https://clover-gilt.vercel.app',
        'https://clover-gilt.vercel.app',
        'production',
      ),
    ).toBe(true);
    expect(
      isAllowedOrigin(
        'https://clover-attacker.vercel.app',
        'https://clover-gilt.vercel.app',
        'production',
      ),
    ).toBe(false);
  });

  it('permits local development origins only outside production', () => {
    expect(isAllowedOrigin('http://localhost:5174', '', 'development')).toBe(
      true,
    );
    expect(isAllowedOrigin('http://localhost:5174', '', 'production')).toBe(
      false,
    );
  });
});
