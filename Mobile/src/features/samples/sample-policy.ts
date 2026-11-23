export function sampleDeadline(sample: {
  revisionDeadlineAt?: string | null;
  deadlineAt?: string | null;
}) {
  const value = sample.revisionDeadlineAt || sample.deadlineAt;
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}
export function canReviewVideo(
  sampleStatus: string,
  assetStatus: string,
  currentUrl?: string | null,
  assetUrl?: string,
) {
  return (
    sampleStatus === "VIDEO_SUBMITTED" &&
    assetStatus === "PENDING" &&
    (!currentUrl || currentUrl === assetUrl)
  );
}
