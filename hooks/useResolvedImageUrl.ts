import { useState, useEffect } from 'react';

export function useResolvedImageUrl(url: string | undefined): string {
  const [resolved, setResolved] = useState<string>(
    (url && url.startsWith('idb://')) 
      ? 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=' 
      : (url || '')
  );

  useEffect(() => {
    if (!url) {
      setResolved('');
      return;
    }
    
    if (url.startsWith('idb://')) {
      import('@/lib/indexedDbStorage').then((m) => {
        m.resolveVirtualUrl(url)
          .then(res => setResolved(res))
          .catch(() => setResolved(url));
      });
    } else {
      setResolved(url);
    }
  }, [url]);

  return resolved;
}
