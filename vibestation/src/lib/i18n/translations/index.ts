// Translation registry - exports all translations
import { en } from './en';
import { ko } from './ko';
import { ja } from './ja';
import type { Translations } from './types';
import type { LanguageCode } from '../languages';

// Re-export types
export type { Translations } from './types';

// Type for translation dictionaries
export type TranslationDictionary = Record<string, Translations>;

// All available translations
export const translations: Partial<Record<LanguageCode, Translations>> = {
  en,
  ko,
  ja,
  // Add more translations here as they become available
  // Other languages will fall back to English
};

// Get translation for a language code, falling back to English
export function getTranslation(code: LanguageCode | string): Translations {
  return (translations as Record<string, Translations>)[code] || en;
}

// Check if a language has translations available
export function hasTranslation(code: LanguageCode | string): boolean {
  return code in translations;
}

// Get list of fully translated languages
export function getTranslatedLanguages(): LanguageCode[] {
  return Object.keys(translations) as LanguageCode[];
}
