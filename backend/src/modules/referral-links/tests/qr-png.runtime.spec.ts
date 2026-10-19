import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { renderQrPng } from '../utils/qr-png.renderer';

describe('PNG QR renderer runtime', () => {
  it.each([512, 1024, 2048])(
    'renders and decodes the real branded PNG at %i px',
    (size) => {
      const url = 'https://scanms.vn/r/a7kp2m9q?via=qr';
      const png = PNG.sync.read(renderQrPng(url, size));
      expect(png.width).toBe(size);
      expect(png.height).toBe(size);
      expect(jsQR(new Uint8ClampedArray(png.data), size, size)?.data).toBe(url);
      expect([...png.data.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
    },
  );

  it('rejects arbitrary image sizes before allocating a pixel buffer', () => {
    expect(() => renderQrPng('x', 100000)).toThrow(RangeError);
  });
});
