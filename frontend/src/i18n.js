import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { translations } from './locales/translations';

// Convert translations object to i18next resources format
const resources = {};
Object.keys(translations).forEach((lang) => {
  resources[lang] = { translation: translations[lang] };
});

i18n
  .use(LanguageDetector) // Auto-detect browser/device language
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en', // Default to English for unsupported languages
    debug: false,

    detection: {
      // Order of language detection (like Instagram)
      order: ['navigator', 'querystring', 'localStorage', 'htmlTag'],
      // Cache user language preference
      caches: ['localStorage'],
      lookupQuerystring: 'lang',
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
