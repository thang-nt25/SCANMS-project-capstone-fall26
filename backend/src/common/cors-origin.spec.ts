import { isAllowedFrontendOrigin } from './cors-origin';

describe('frontend origins', () => {
  it('allows Android emulator development requests on either frontend port', () => {
    for (const port of [5173, 5180]) {
      expect(isAllowedFrontendOrigin(`http://10.0.2.2:${port}`, { NODE_ENV: 'development' })).toBe(true);
    }
  });
  it('requires explicit configuration for emulator origins in production', () => {
    expect(isAllowedFrontendOrigin('http://10.0.2.2:5180', { NODE_ENV: 'production' })).toBe(false);
    expect(isAllowedFrontendOrigin('https://scanms.example', {
      NODE_ENV: 'production', CORS_ORIGINS: 'https://scanms.example',
    })).toBe(true);
  });
  it('rejects lookalike hosts and arbitrary origins', () => {
    for (const origin of ['http://10.0.2.2.evil:5180', 'https://evil.example', 'null']) {
      expect(isAllowedFrontendOrigin(origin, { NODE_ENV: 'development' })).toBe(false);
    }
  });
  it('preserves local development, configured URLs and requests without Origin', () => {
    expect(isAllowedFrontendOrigin('http://localhost:5180', {})).toBe(true);
    expect(isAllowedFrontendOrigin(undefined, {})).toBe(true);
    expect(isAllowedFrontendOrigin('https://scanms.example/', { FRONTEND_URL: 'https://scanms.example' })).toBe(true);
  });
});
