import { useState } from 'react';
import type { UserProfile } from '../../services/auth.service';

export function AccountAvatar({ user, name, useShopLogo = false }: {
  user: UserProfile | null | undefined;
  name: string;
  useShopLogo?: boolean;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const stores = useShopLogo ? user?.stores : undefined;
  const store = stores?.find((entry) => entry.id === user?.storeId) ?? stores?.[0];
  const src = [user?.avatarUrl, store?.logoUrl].find(
    (url): url is string => typeof url === 'string' && !!url.trim() && !failedSources.includes(url),
  );
  const reject = (url: string) => {
    setFailedSources((sources) => sources.includes(url) ? sources : [...sources, url]);
  };

  return src ? (
    <img
      key={src}
      src={src}
      alt=""
      className="block size-full rounded-[inherit] object-cover"
      onError={() => reject(src)}
      onLoad={({ currentTarget }) => {
        if (currentTarget.naturalWidth <= 2 || currentTarget.naturalHeight <= 2) reject(src);
      }}
    />
  ) : (
    <span aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
  );
}
