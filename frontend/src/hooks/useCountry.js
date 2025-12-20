import { useMemo } from 'react';

export default function useCountry() {
  const country = useMemo(() => {
    // Simple heuristic based on Timezone
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (timezone.includes('Seoul')) {
        return { code: 'KR', name: 'South Korea', flag: '🇰🇷' };
      } else if (timezone.includes('Tokyo')) {
        return { code: 'JP', name: 'Japan', flag: '🇯🇵' };
      } else if (timezone.includes('London') || timezone.includes('Europe')) {
        return { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' };
      }
    } catch (e) {
      console.warn('Timezone detection failed', e);
    }
    // Default to US
    return { code: 'US', name: 'United States', flag: '🇺🇸' };
  }, []);

  return country;
}
