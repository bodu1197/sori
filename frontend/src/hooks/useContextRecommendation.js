// @ts-nocheck
import { useState, useEffect } from 'react';

/**
 * Context-based music recommendation hook
 * Determines mood based on time of day, weather, and temperature
 */
export default function useContextRecommendation() {
  const [context, setContext] = useState({
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
        // 1. Get time of day
        const hour = new Date().getHours();
        let timeOfDay, greeting;

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

        // 2. Try to get weather (using free IP geolocation + OpenWeatherMap)
        let weather = null;
        let temperature = null;
        let locationName = '';

        try {
          // Get location from IP
          const geoResponse = await fetch('https://ipapi.co/json/');
          const geoData = await geoResponse.json();

          if (geoData.latitude && geoData.longitude) {
            locationName = geoData.city || geoData.country_name || '';

            // Get weather from Open-Meteo (free, no API key needed)
            const weatherResponse = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current=temperature_2m,weather_code`
            );
            const weatherData = await weatherResponse.json();

            if (weatherData.current) {
              temperature = Math.round(weatherData.current.temperature_2m);
              const weatherCode = weatherData.current.weather_code;

              // Map weather codes to conditions
              // https://open-meteo.com/en/docs (WMO Weather interpretation codes)
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
          console.log('Weather fetch failed, using time-based only');
        }

        // 3. Determine mood and recommendation based on context
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
      } catch (error) {
        console.error('Context fetch error:', error);
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

/**
 * Determine mood and playlist recommendation based on context
 */
function getMoodAndRecommendation(timeOfDay, weather, temperature, locationName) {
  let mood = 'upbeat';
  let genre = 'Pop Hits';
  let emoji = '🎵';
  let message = '';

  // Time-based defaults
  switch (timeOfDay) {
    case 'morning':
      mood = 'energetic';
      genre = 'Morning Motivation';
      emoji = '☀️';
      message = 'Start your day with energy!';
      break;
    case 'afternoon':
      mood = 'focused';
      genre = 'Focus & Work';
      emoji = '💪';
      message = 'Stay productive!';
      break;
    case 'evening':
      mood = 'relaxed';
      genre = 'Evening Chill';
      emoji = '🌆';
      message = 'Wind down your day.';
      break;
    case 'night':
      mood = 'calm';
      genre = 'Late Night Vibes';
      emoji = '🌙';
      message = 'Perfect for late nights.';
      break;
  }

  // Weather overrides
  if (weather) {
    switch (weather) {
      case 'rainy':
        mood = 'chill';
        genre = 'Rainy Day Jazz';
        emoji = '🌧️';
        message = locationName
          ? `Rainy in ${locationName}? Perfect for chill vibes.`
          : 'Rainy day vibes.';
        break;
      case 'snowy':
        mood = 'cozy';
        genre = 'Cozy Winter';
        emoji = '❄️';
        message = 'Stay warm with cozy tunes.';
        break;
      case 'stormy':
        mood = 'intense';
        genre = 'Epic & Cinematic';
        emoji = '⛈️';
        message = 'Epic music for stormy weather.';
        break;
      case 'clear':
        if (timeOfDay === 'morning') {
          genre = 'Sunny Morning';
          emoji = '🌅';
          message = 'Beautiful day ahead!';
        } else if (timeOfDay === 'evening') {
          genre = 'Sunset Vibes';
          emoji = '🌇';
          message = 'Enjoy the sunset.';
        }
        break;
    }
  }

  // Temperature overrides
  if (temperature !== null) {
    if (temperature >= 30) {
      mood = 'tropical';
      genre = 'Summer Hits';
      emoji = '🔥';
      message = `It's ${temperature}°C! Cool down with summer jams.`;
    } else if (temperature <= 5) {
      mood = 'cozy';
      genre = 'Warm & Cozy';
      emoji = '🧣';
      message = `Brrr, ${temperature}°C! Stay warm with cozy music.`;
    }
  }

  return {
    mood,
    recommendation: {
      genre,
      emoji,
      message,
      searchQuery: genre, // Used to search for playlists
    },
  };
}
