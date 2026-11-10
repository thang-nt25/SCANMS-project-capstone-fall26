import qrcode from "qrcode-generator";

// Encode locally. Payment contents never leave the device for a QR image service.
// ESM (Metro) and CommonJS builds expose different optional UTF-8 helpers.
// Use the same byte conversion in both runtimes instead of relying on that helper.
qrcode.stringToBytes = (value) => {
  const encoded = encodeURIComponent(value),
    bytes: number[] = [];
  for (let index = 0; index < encoded.length; index++) {
    if (encoded[index] === "%") {
      bytes.push(Number.parseInt(encoded.slice(index + 1, index + 3), 16));
      index += 2;
    } else bytes.push(encoded.charCodeAt(index));
  }
  return bytes;
};
export function paymentQrImage(value: string) {
  if (!value || value.length > 2500)
    throw new Error("Nội dung QR không hợp lệ.");
  const qr = qrcode(0, "M");
  qr.addData(value, "Byte");
  qr.make();
  return qr.createDataURL(5, 20);
}
