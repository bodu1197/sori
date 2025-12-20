import { useMemo } from 'react';

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export default function useCountry(): Country {
  const country = useMemo<Country>(() => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (timezone.includes('Seoul')) {
        return { code: 'KR', name: 'South Korea', flag: 'KR' };
      } else if (timezone.includes('Tokyo')) {
        return { code: 'JP', name: 'Japan', flag: 'JP' };
      } else if (timezone.includes('London') || timezone.includes('Europe')) {
        return { code: 'GB', name: 'United Kingdom', flag: 'GB' };
      }
    } catch {
      // Timezone detection failed, use default
    }
    return { code: 'US', name: 'United States', flag: 'US' };
  }, []);

  return country;
}
