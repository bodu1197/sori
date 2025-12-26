'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageByCode, isRTL, type LanguageCode } from './languages';
import { getTranslation, type Translations } from './translations';

// Storage key for persisting language preference
const LANGUAGE_STORAGE_KEY = 'vibestation-language';

// Context type
interface I18nContextType {
  locale: LanguageCode;
  setLocale: (locale: LanguageCode) => void;
  t: Translations;
  isRTL: boolean;
  languages: typeof SUPPORTED_LANGUAGES;
  currentLanguage: (typeof SUPPORTED_LANGUAGES)[number] | undefined;
  formatNumber: (num: number) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatRelativeTime: (date: Date | string) => string;
}

// Create context
const I18nContext = createContext<I18nContextType | null>(null);

// Detect browser language
function detectBrowserLanguage(): LanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  // Try navigator.language first
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage;

  if (browserLang) {
    // Exact match
    const exactMatch = SUPPORTED_LANGUAGES.find(lang => lang.code === browserLang);
    if (exactMatch) return exactMatch.code as LanguageCode;

    // Try base language (e.g., 'en-US' -> 'en')
    const baseLang = browserLang.split('-')[0];
    const baseMatch = SUPPORTED_LANGUAGES.find(lang => lang.code === baseLang);
    if (baseMatch) return baseMatch.code as LanguageCode;
  }

  return DEFAULT_LANGUAGE;
}

// Get stored language
function getStoredLanguage(): LanguageCode | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && getLanguageByCode(stored)) {
      return stored as LanguageCode;
    }
  } catch {
    // localStorage not available
  }

  return null;
}

// Store language preference
function storeLanguage(locale: LanguageCode): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    // localStorage not available
  }
}

// Provider props
interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: LanguageCode;
}

// Provider component
export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<LanguageCode>(() => {
    // Priority: initialLocale > stored > browser > default
    if (initialLocale) return initialLocale;
    const stored = getStoredLanguage();
    if (stored) return stored;
    return detectBrowserLanguage();
  });

  // Get translations for current locale
  const t = useMemo(() => getTranslation(locale), [locale]);

  // Check if current locale is RTL
  const rtl = useMemo(() => isRTL(locale), [locale]);

  // Get current language info
  const currentLanguage = useMemo(() => getLanguageByCode(locale), [locale]);

  // Set locale and persist
  const setLocale = useCallback((newLocale: LanguageCode) => {
    setLocaleState(newLocale);
    storeLanguage(newLocale);

    // Update document direction
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTL(newLocale) ? 'rtl' : 'ltr';
      document.documentElement.lang = newLocale;
    }
  }, []);

  // Update document attributes on mount and locale change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
  }, [locale, rtl]);

  // Number formatter
  const formatNumber = useCallback((num: number): string => {
    return new Intl.NumberFormat(locale).format(num);
  }, [locale]);

  // Date formatter
  const formatDate = useCallback((
    date: Date | string,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
  ): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(d);
  }, [locale]);

  // Currency formatter
  const formatCurrency = useCallback((amount: number, currency = 'USD'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  }, [locale]);

  // Relative time formatter
  const formatRelativeTime = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) {
      return t.time.justNow;
    } else if (diffMin < 60) {
      return t.time.minutesAgo.replace('{count}', String(diffMin));
    } else if (diffHour < 24) {
      return t.time.hoursAgo.replace('{count}', String(diffHour));
    } else if (diffDay < 7) {
      return t.time.daysAgo.replace('{count}', String(diffDay));
    } else if (diffWeek < 4) {
      return t.time.weeksAgo.replace('{count}', String(diffWeek));
    } else if (diffMonth < 12) {
      return t.time.monthsAgo.replace('{count}', String(diffMonth));
    } else {
      return t.time.yearsAgo.replace('{count}', String(diffYear));
    }
  }, [locale, t.time]);

  // Context value
  const value = useMemo<I18nContextType>(() => ({
    locale,
    setLocale,
    t,
    isRTL: rtl,
    languages: SUPPORTED_LANGUAGES,
    currentLanguage,
    formatNumber,
    formatDate,
    formatCurrency,
    formatRelativeTime,
  }), [locale, setLocale, t, rtl, currentLanguage, formatNumber, formatDate, formatCurrency, formatRelativeTime]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook to use i18n context
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Shorthand hook for just translations
export function useTranslation() {
  const { t, locale, isRTL } = useI18n();
  return { t, locale, isRTL };
}
