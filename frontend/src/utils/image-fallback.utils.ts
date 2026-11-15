type ImageErrorEvent = { currentTarget: HTMLImageElement };

function applyImageFallback(event: ImageErrorEvent, path: string): void {
  const image = event.currentTarget;
  const fallback = new URL(path, image.ownerDocument.baseURI).href;
  // Do not loop if the placeholder itself cannot be served. Unlike a permanent
  // dataset flag, comparing URLs also allows a later src update to recover.
  if (image.src !== fallback) image.src = fallback;
}

export function handleProductImageError(event: ImageErrorEvent): void {
  applyImageFallback(event, '/assets/product-placeholder.svg');
}

export function handleAvatarImageError(event: ImageErrorEvent): void {
  applyImageFallback(event, '/assets/avatar-placeholder.svg');
}

export function handleStoreImageError(event: ImageErrorEvent): void {
  applyImageFallback(event, '/assets/store-placeholder.svg');
}
