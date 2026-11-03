export function isOwnProductSubmission(product: {
  createdById?: string | null; submittedById?: string | null;
} | null | undefined, actorId?: string) {
  return Boolean(actorId && (product?.createdById === actorId || product?.submittedById === actorId));
}
