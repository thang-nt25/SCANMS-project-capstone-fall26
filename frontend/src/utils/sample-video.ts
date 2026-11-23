export interface SampleVideoAsset {
  id: string;
  title: string;
  urlOrContent: string;
  status: string;
}

export interface SubmittedSampleVideo {
  status: string;
  reviewVideoUrl?: string;
  videoTitle?: string;
  videoSubmittedAt?: string;
  videoAssets?: SampleVideoAsset[];
}

/** Review the current submission only; older pending revisions are history. */
export function pendingSampleVideo(sample: SubmittedSampleVideo): SampleVideoAsset | undefined {
  if (sample.status !== 'VIDEO_SUBMITTED' || !sample.reviewVideoUrl) return undefined;
  return sample.videoAssets?.find(asset =>
    asset.status === 'PENDING' && asset.urlOrContent === sample.reviewVideoUrl,
  );
}

export function sampleVideoLink(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
