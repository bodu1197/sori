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

// Helper function to determine time of day and greeting
function getTimeContext(hour: number): { timeOfDay: TimeOfDay; greeting: string } {
  if (hour >= 5 && hour < 12) {
    return { timeOfDay: 'morning', greeting: 'Good Morning' };
  }
  if (hour >= 12 && hour < 17) {
    return { timeOfDay: 'afternoon', greeting: 'Good Afternoon' };
  }
  if (hour >= 17 && hour < 21) {
    return { timeOfDay: 'evening', greeting: 'Good Evening' };
  }
  return { timeOfDay: 'night', greeting: 'Good Night' };
}

// Helper function to convert weather code to condition
function getWeatherCondition(weatherCode: number): WeatherCondition {
  if ([0, 1].includes(weatherCode)) return 'clear';
  if ([2, 3].includes(weatherCode)) return 'cloudy';
  if ([45, 48].includes(weatherCode)) return 'foggy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return 'rainy';
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snowy';
  if ([95, 96, 99].includes(weatherCode)) return 'stormy';
  return 'clear';
}

// Helper function to fetch weather data
async function fetchWeatherData(
  geoData: GeoResponse
): Promise<{ weather: WeatherCondition; temperature: number | null; locationName: string }> {
  const locationName = geoData.city || geoData.country_name || '';

  if (!geoData.latitude || !geoData.longitude) {
    return { weather: null, temperature: null, locationName };
  }

  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current=temperature_2m,weather_code`
  );
  const weatherData: WeatherResponse = await weatherResponse.json();

  if (!weatherData.current) {
    return { weather: null, temperature: null, locationName };
  }

  return {
    weather: getWeatherCondition(weatherData.current.weather_code),
    temperature: Math.round(weatherData.current.temperature_2m),
    locationName,
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
        const { timeOfDay, greeting } = getTimeContext(hour);

        let weather: WeatherCondition = null;
        let temperature: number | null = null;
        let locationName = '';

        try {
          const geoResponse = await fetch('https://ipapi.co/json/');
          const geoData: GeoResponse = await geoResponse.json();
          const weatherResult = await fetchWeatherData(geoData);
          weather = weatherResult.weather;
          temperature = weatherResult.temperature;
          locationName = weatherResult.locationName;
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
