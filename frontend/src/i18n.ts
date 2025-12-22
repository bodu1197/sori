import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { translations, SupportedLanguage } from './locales/translations';

interface Resources {
  [key: string]: {
    translation: typeof translations.en;
  };
}

const resources: Resources = {};
(Object.keys(translations) as SupportedLanguage[]).forEach((lang) => {
  resources[lang] = { translation: translations[lang] };
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: Object.keys(translations),
    debug: false,

    detection: {
      order: ['navigator', 'querystring', 'localStorage', 'htmlTag'],
      caches: ['localStorage'],
      lookupQuerystring: 'lang',
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
