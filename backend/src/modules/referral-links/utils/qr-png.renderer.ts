import * as QRCode from 'qrcode';
import { PNG } from 'pngjs';

/** Bounded rasterization avoids the legacy PNG stream's unresolved end callback. */
export function renderQrPng(text: string, size: number): Buffer {
  if (![512, 1024, 2048].includes(size))
    throw new RangeError('Unsupported QR size');
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const margin = 4;
  const scale = size / (qr.modules.size + margin * 2);
  const image = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / scale) - margin;
    for (let x = 0; x < size; x++) {
      const col = Math.floor(x / scale) - margin;
      const dark =
        row >= 0 &&
        col >= 0 &&
        row < qr.modules.size &&
        col < qr.modules.size &&
        qr.modules.get(row, col);
      const offset = (y * size + x) * 4;
      image.data[offset] = dark ? 0x1a : 255;
      image.data[offset + 1] = dark ? 0x16 : 255;
      image.data[offset + 2] = dark ? 0x12 : 255;
      image.data[offset + 3] = 255;
    }
  }
  return PNG.sync.write(image, { deflateLevel: 6 });
}
