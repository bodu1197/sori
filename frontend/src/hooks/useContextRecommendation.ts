import { useState, useEffect } from 'react';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'day';
type WeatherCondition = 'clear' | 'cloudy' | 'foggy' | 'rainy' | 'snowy' | 'stormy' | null;
type Mood =
  | 'upbeat'
  | 'energetic'
  | 'focused'
  | 'relaxed'
  | 'calm'
  | 'chill'
  | 'cozy'
  | 'intense'
  | 'tropical';

interface Recommendation {
  genre: string;
  emoji: string;
  message: string;
  searchQuery: string;
}

interface ContextState {
  timeOfDay: TimeOfDay;
  greeting: string;
  weather: WeatherCondition;
  temperature: number | null;
  mood: Mood;
  recommendation: Recommendation | null;
  locationName?: string;
  loading: boolean;
  error: string | null;
}

interface GeoResponse {
  latitude?: number;
  longitude?: number;
  city?: string;
  country_name?: string;
}

interface WeatherResponse {
  current?: {
    temperature_2m: number;
    weather_code: number;
  };
}

export default function useContextRecommendation(): ContextState {
  const [context, setContext] = useState<ContextState>({
    timeOfDay: 'day',
    greeting: 'Hello',
    weather: null,
    temperature: null,
    mood: 'upbeat',
    recommendation: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchContext() {
      try {
        const hour = new Date().getHours();
        let timeOfDay: TimeOfDay;
        let greeting: string;

        if (hour >= 5 && hour < 12) {
          timeOfDay = 'morning';
          greeting = 'Good Morning';
        } else if (hour >= 12 && hour < 17) {
          timeOfDay = 'afternoon';
          greeting = 'Good Afternoon';
        } else if (hour >= 17 && hour < 21) {
          timeOfDay = 'evening';
          greeting = 'Good Evening';
        } else {
          timeOfDay = 'night';
          greeting = 'Good Night';
        }

        let weather: WeatherCondition = null;
        let temperature: number | null = null;
        let locationName = '';

        try {
          const geoResponse = await fetch('https://ipapi.co/json/');
          const geoData: GeoResponse = await geoResponse.json();

          if (geoData.latitude && geoData.longitude) {
            locationName = geoData.city || geoData.country_name || '';

            const weatherResponse = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current=temperature_2m,weather_code`
            );
            const weatherData: WeatherResponse = await weatherResponse.json();

            if (weatherData.current) {
              temperature = Math.round(weatherData.current.temperature_2m);
              const weatherCode = weatherData.current.weather_code;

              if ([0, 1].includes(weatherCode)) {
                weather = 'clear';
              } else if ([2, 3].includes(weatherCode)) {
                weather = 'cloudy';
              } else if ([45, 48].includes(weatherCode)) {
                weather = 'foggy';
              } else if (
                [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)
              ) {
                weather = 'rainy';
              } else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
                weather = 'snowy';
              } else if ([95, 96, 99].includes(weatherCode)) {
                weather = 'stormy';
              } else {
                weather = 'clear';
              }
            }
          }
        } catch {
          // Weather fetch failed, using time-based only
        }

        const { mood, recommendation } = getMoodAndRecommendation(
          timeOfDay,
          weather,
          temperature,
          locationName
        );

        setContext({
          timeOfDay,
          greeting,
          weather,
          temperature,
          mood,
          recommendation,
          locationName,
          loading: false,
          error: null,
        });
      } catch {
        setContext((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to load recommendations',
        }));
      }
    }

    fetchContext();
  }, []);

  return context;
}

interface MoodConfig {
  mood: Mood;
  genre: string;
  emoji: string;
  message: string;
}

function getTimeBasedMood(timeOfDay: TimeOfDay): MoodConfig {
  const configs: Record<TimeOfDay, MoodConfig> = {
    morning: {
      mood: 'energetic',
      genre: 'Morning Motivation',
      emoji: '',
      message: 'Start your day with energy!',
    },
    afternoon: { mood: 'focused', genre: 'Focus & Work', emoji: '', message: 'Stay productive!' },
    evening: { mood: 'relaxed', genre: 'Evening Chill', emoji: '', message: 'Wind down your day.' },
    night: {
      mood: 'calm',
      genre: 'Late Night Vibes',
      emoji: '',
      message: 'Perfect for late nights.',
    },
    day: { mood: 'upbeat', genre: 'Pop Hits', emoji: '', message: 'Enjoy your day!' },
  };
  return configs[timeOfDay] || configs.day;
}

function getWeatherBasedMood(
  weather: WeatherCondition,
  timeOfDay: TimeOfDay,
  locationName: string
): MoodConfig | null {
  if (!weather) return null;

  const weatherConfigs: Partial<Record<NonNullable<WeatherCondition>, MoodConfig>> = {
    rainy: {
      mood: 'chill',
      genre: 'Rainy Day Jazz',
      emoji: '',
      message: locationName
        ? `Rainy in ${locationName}? Perfect for chill vibes.`
        : 'Rainy day vibes.',
    },
    snowy: { mood: 'cozy', genre: 'Cozy Winter', emoji: '', message: 'Stay warm with cozy tunes.' },
    stormy: {
      mood: 'intense',
      genre: 'Epic & Cinematic',
      emoji: '',
      message: 'Epic music for stormy weather.',
    },
  };

  const weatherConfig = weatherConfigs[weather];
  if (weatherConfig) {
    return weatherConfig;
  }

  // Clear weather special handling
  if (weather === 'clear') {
    if (timeOfDay === 'morning') {
      return {
        mood: 'energetic',
        genre: 'Sunny Morning',
        emoji: '',
        message: 'Beautiful day ahead!',
      };
    }
    if (timeOfDay === 'evening') {
      return { mood: 'relaxed', genre: 'Sunset Vibes', emoji: '', message: 'Enjoy the sunset.' };
    }
  }

  return null;
}

function getTemperatureBasedMood(temperature: number | null): MoodConfig | null {
  if (temperature === null) return null;

  if (temperature >= 30) {
    return {
      mood: 'tropical',
      genre: 'Summer Hits',
      emoji: '',
      message: `It's ${temperature}C! Cool down with summer jams.`,
    };
  }
  if (temperature <= 5) {
    return {
      mood: 'cozy',
      genre: 'Warm & Cozy',
      emoji: '',
      message: `Brrr, ${temperature}C! Stay warm with cozy music.`,
    };
  }

  return null;
}

function getMoodAndRecommendation(
  timeOfDay: TimeOfDay,
  weather: WeatherCondition,
  temperature: number | null,
  locationName: string
): { mood: Mood; recommendation: Recommendation } {
  // Start with time-based mood as default
  let config = getTimeBasedMood(timeOfDay);

  // Override with weather-based mood if applicable
  const weatherConfig = getWeatherBasedMood(weather, timeOfDay, locationName);
  if (weatherConfig) {
    config = weatherConfig;
  }

  // Override with temperature-based mood if extreme
  const tempConfig = getTemperatureBasedMood(temperature);
  if (tempConfig) {
    config = tempConfig;
  }

  return {
    mood: config.mood,
    recommendation: {
      genre: config.genre,
      emoji: config.emoji,
      message: config.message,
      searchQuery: config.genre,
    },
  };
}
