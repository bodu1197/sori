import React, { useState, useCallback } from 'react';
import { Languages, Loader2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/api';

interface TranslateButtonProps {
  readonly postId?: string;
  readonly text: string;
  readonly sourceLanguage?: string;
  readonly onTranslated?: (translatedText: string, sourceLanguage: string) => void;
  readonly size?: number;
  readonly showLabel?: boolean;
}

// Language names for display
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  zh: '中文',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  id: 'Bahasa Indonesia',
  ar: 'العربية',
  hi: 'हिन्दी',
  ru: 'Русский',
  tr: 'Türkçe',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  sw: 'Kiswahili',
};

// Helper: Get button style class
function getButtonStyleClass(translated: boolean, error: boolean, loading: boolean): string {
  const baseClass = 'inline-flex items-center gap-1 text-xs transition-all';
  let stateClass = 'text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300';

  if (translated) {
    stateClass = 'text-green-600 dark:text-green-400';
  } else if (error) {
    stateClass = 'text-red-500 dark:text-red-400';
  }

  return `${baseClass} ${stateClass} ${loading ? 'opacity-70' : ''}`;
}

// Helper: Get button label key
function getButtonLabelKey(loading: boolean, translated: boolean, error: boolean): string {
  if (loading) return 'translate.translating';
  if (translated) return 'translate.translated';
  if (error) return 'translate.error';
  return 'translate.button';
}

// Helper: Render button icon
function renderButtonIcon(loading: boolean, translated: boolean, size: number) {
  if (loading) return <Loader2 size={size} className="animate-spin" />;
  if (translated) return <Check size={size} />;
  return <Languages size={size} />;
}

export default function TranslateButton({
  postId,
  text,
  sourceLanguage,
  onTranslated,
  size = 16,
  showLabel = true,
}: TranslateButtonProps) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [error, setError] = useState(false);

  // Get user's preferred language from i18n
  const targetLanguage = i18n.language.split('-')[0]; // 'en-US' -> 'en'

  const handleTranslate = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (loading || translated) return;

      // Don't translate if already in target language
      if (sourceLanguage && sourceLanguage === targetLanguage) {
        return;
      }

      setLoading(true);
      setError(false);

      try {
        const result = await translateText(text, targetLanguage, postId, sourceLanguage);

        if (result) {
          if (result.same_language) {
            // Already in target language
            setTranslated(true);
            return;
          }

          setTranslated(true);
          onTranslated?.(result.translated_text, result.source_language);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Translation failed:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [text, targetLanguage, postId, sourceLanguage, loading, translated, onTranslated]
  );

  // Don't show if same language detected
  if (sourceLanguage && sourceLanguage === targetLanguage) {
    return null;
  }

  // Don't show for very short texts
  if (!text || text.length < 5) {
    return null;
  }

  const showSourceIndicator = sourceLanguage && !translated && !loading;

  return (
    <button
      onClick={handleTranslate}
      disabled={loading || translated}
      className={getButtonStyleClass(translated, error, loading)}
      aria-label={t('translate.button')}
    >
      {renderButtonIcon(loading, translated, size)}

      {showLabel && (
        <span className="font-medium">{t(getButtonLabelKey(loading, translated, error))}</span>
      )}

      {showSourceIndicator && (
        <span className="text-gray-400 dark:text-gray-500 text-[10px] ml-1">
          ({LANGUAGE_NAMES[sourceLanguage] || sourceLanguage.toUpperCase()})
        </span>
      )}
    </button>
  );
}

// Hook to manage translation state for a post
export function usePostTranslation(originalText: string) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);

  const handleTranslated = useCallback((text: string, sourceLang: string) => {
    setTranslatedText(text);
    setSourceLanguage(sourceLang);
    setShowOriginal(false);
  }, []);

  const toggleView = useCallback(() => {
    if (translatedText) {
      setShowOriginal((prev) => !prev);
    }
  }, [translatedText]);

  return {
    displayText: showOriginal ? originalText : translatedText || originalText,
    isTranslated: !showOriginal && !!translatedText,
    sourceLanguage,
    handleTranslated,
    toggleView,
    showOriginal,
  };
}
