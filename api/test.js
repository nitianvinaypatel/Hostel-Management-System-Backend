/**
 * Basic health check test for HMS Backend
 */

describe('HMS Backend - Health Check', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });

  it('should have environment setup', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
