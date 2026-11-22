import { resolvePublicAppUrl } from './public-app-url';
describe('Public website URL', () => {
  it('does not leak localhost into public links', () => {
    expect(resolvePublicAppUrl(undefined, 'http://localhost:5173')).toBe('https://scanms.io.vn');
    expect(resolvePublicAppUrl('http://127.0.0.1:3000', 'https://scanms.io.vn')).toBe('https://scanms.io.vn');
  });
  it('prefers the explicitly configured public deployment', () => {
    expect(resolvePublicAppUrl('https://www.scanms.io.vn/', 'https://other.example')).toBe('https://www.scanms.io.vn');
  });
  it('rejects invalid protocols and credentials', () => {
    expect(resolvePublicAppUrl('javascript:alert(1)', 'https://user:password@example.test')).toBe('https://scanms.io.vn');
  });
});
