export const MAX_PRODUCT_GALLERY_IMAGES = 4;

export function assertProductCoverDimensions(width: number, height: number) {
  if (!width || !height || width <= 0 || height <= 0)
    throw new Error('Ảnh không hợp lệ hoặc không đọc được kích thước.');
}

export function validateProductCoverUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => { image.onload = null; image.onerror = null; reject(new Error('Quá thời gian đọc ảnh bìa. Vui lòng thử lại.')); }, 15_000);
    image.onload = () => {
      window.clearTimeout(timer);
      try { assertProductCoverDimensions(image.naturalWidth, image.naturalHeight); resolve(); }
      catch (error) { reject(error); }
    };
    image.onerror = () => { window.clearTimeout(timer); reject(new Error('Không đọc được kích thước ảnh bìa. Vui lòng chọn lại ảnh.')); };
    image.src = url;
  });
}

export async function validateProductCoverFile(file: File) {
  const url = URL.createObjectURL(file);
  try { await validateProductCoverUrl(url); }
  finally { URL.revokeObjectURL(url); }
}
