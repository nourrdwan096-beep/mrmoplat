import { useState, useEffect } from 'react';

export const DEFAULT_FALLBACK_COVER = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop&q=80';

export function useResolvedImageUrl(url: string | undefined): string {
  const [resolved, setResolved] = useState<string>(() => {
    if (!url || !url.trim()) return DEFAULT_FALLBACK_COVER;
    if (url.startsWith('idb://')) {
      return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    }
    return url;
  });

  useEffect(() => {
    if (!url || !url.trim()) {
      setResolved(DEFAULT_FALLBACK_COVER);
      return;
    }
    
    if (url.startsWith('idb://')) {
      import('@/lib/indexedDbStorage').then((m) => {
        m.resolveVirtualUrl(url)
          .then(res => {
            if (!res || res.startsWith('idb://')) {
              setResolved(DEFAULT_FALLBACK_COVER);
            } else {
              setResolved(res);
            }
          })
          .catch(() => setResolved(DEFAULT_FALLBACK_COVER));
      }).catch(() => setResolved(DEFAULT_FALLBACK_COVER));
    } else {
      setResolved(url);
    }
  }, [url]);

  return resolved || DEFAULT_FALLBACK_COVER;
}

