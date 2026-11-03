import type { MediaAsset } from '../services/media.service';
import { isStreamingPage } from './media-pack.utils';

export function mediaSourceUrl(asset: MediaAsset, baseUrl: string) {
  if (!asset.urlOrContent?.trim()) return null;
  try {
    const url = new URL(asset.urlOrContent, baseUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function isExternalMediaVideo(asset: MediaAsset, baseUrl: string) {
  const source = mediaSourceUrl(asset, baseUrl);
  return asset.assetType === 'VIDEO' && Boolean(source && isStreamingPage(new URL(source)));
}

export async function copyMediaScript(asset: MediaAsset) {
  if (asset.assetType !== 'COPYWRITE_TEXT') throw new Error('Tài nguyên này không phải kịch bản.');
  await navigator.clipboard.writeText(asset.urlOrContent);
}
