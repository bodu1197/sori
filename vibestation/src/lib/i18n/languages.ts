// 76 languages supported (matching YouTube Music's global coverage)
export const SUPPORTED_LANGUAGES = [
  // Major Languages
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '中文(简体)', dir: 'ltr' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文(繁體)', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', dir: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr' },

  // Asian Languages
  { code: 'th', name: 'Thai', nativeName: 'ไทย', dir: 'ltr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', dir: 'ltr' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', dir: 'ltr' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', dir: 'ltr' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', dir: 'ltr' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', dir: 'ltr' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', dir: 'ltr' },

  // Middle Eastern & African Languages
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', dir: 'rtl' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', dir: 'rtl' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', dir: 'ltr' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', dir: 'ltr' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', dir: 'ltr' },

  // European Languages
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', dir: 'ltr' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', dir: 'ltr' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', dir: 'ltr' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', dir: 'ltr' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', dir: 'ltr' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', dir: 'ltr' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', dir: 'ltr' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', dir: 'ltr' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', dir: 'ltr' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', dir: 'ltr' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', dir: 'ltr' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', dir: 'ltr' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', dir: 'ltr' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', dir: 'ltr' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', dir: 'ltr' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', dir: 'ltr' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', dir: 'ltr' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', dir: 'ltr' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', dir: 'ltr' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', dir: 'ltr' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', dir: 'ltr' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', dir: 'ltr' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', dir: 'ltr' },

  // Other Languages
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', dir: 'ltr' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայեր', dir: 'ltr' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', dir: 'ltr' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ', dir: 'ltr' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek', dir: 'ltr' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', dir: 'ltr' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', dir: 'ltr' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', dir: 'ltr' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const getLanguageByCode = (code: string) =>
  SUPPORTED_LANGUAGES.find(lang => lang.code === code);

export const getLanguageDirection = (code: string): 'ltr' | 'rtl' =>
  getLanguageByCode(code)?.dir || 'ltr';

export const isRTL = (code: string): boolean =>
  getLanguageDirection(code) === 'rtl';
