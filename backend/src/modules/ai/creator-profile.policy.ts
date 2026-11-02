/** Only public marketing evidence enters the local model. Never serialize the
 * entire profile JSON: it can also contain account/policy metadata. */
export function creatorProfileText(creator: {
  collaboratorProfile?: {
    bio?: string | null;
    socialLinksJson?: unknown;
  } | null;
  socialChannels: Array<{ channelName?: string | null }>;
}) {
  const json = creator.collaboratorProfile?.socialLinksJson;
  const tags =
    json && typeof json === 'object' && !Array.isArray(json)
      ? (json as Record<string, unknown>).tags
      : [];
  return [
    creator.collaboratorProfile?.bio,
    ...creator.socialChannels.map((channel) => channel.channelName),
    ...(Array.isArray(tags)
      ? tags
          .filter((tag): tag is string => typeof tag === 'string')
          .slice(0, 20)
      : []),
  ]
    .filter(
      (value): value is string =>
        typeof value === 'string' && Boolean(value.trim()),
    )
    .join(' · ')
    .normalize('NFC')
    .slice(0, 2000);
}
