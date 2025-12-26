'use client';

import { useState } from 'react';
import { useI18n, SUPPORTED_LANGUAGES, hasTranslation, type LanguageCode } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown, Globe, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  variant?: 'button' | 'dropdown' | 'compact';
  className?: string;
  showNativeName?: boolean;
  showFlag?: boolean;
}

export function LanguageSelector({
  variant = 'dropdown',
  className,
  showNativeName = true,
}: LanguageSelectorProps) {
  const { locale, setLocale, currentLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Filter languages based on search
  const filteredLanguages = SUPPORTED_LANGUAGES.filter((lang) => {
    const searchLower = search.toLowerCase();
    return (
      lang.name.toLowerCase().includes(searchLower) ||
      lang.nativeName.toLowerCase().includes(searchLower) ||
      lang.code.toLowerCase().includes(searchLower)
    );
  });

  // Group languages by translation availability
  const translatedLanguages = filteredLanguages.filter((lang) => hasTranslation(lang.code));
  const otherLanguages = filteredLanguages.filter((lang) => !hasTranslation(lang.code));

  const handleSelect = (code: string) => {
    setLocale(code as LanguageCode);
    setOpen(false);
    setSearch('');
  };

  if (variant === 'compact') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9', className)}
            aria-label={t.settings.language}
          >
            <Globe className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="end">
          <Command>
            <CommandInput
              placeholder={`${t.common.search}...`}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No language found.</CommandEmpty>
              {translatedLanguages.length > 0 && (
                <CommandGroup heading="Fully translated">
                  {translatedLanguages.map((lang) => (
                    <CommandItem
                      key={lang.code}
                      value={lang.code}
                      onSelect={handleSelect}
                    >
                      <span className="flex-1">
                        {showNativeName ? lang.nativeName : lang.name}
                      </span>
                      {lang.code === locale && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {otherLanguages.length > 0 && (
                <CommandGroup heading="Other languages">
                  {otherLanguages.map((lang) => (
                    <CommandItem
                      key={lang.code}
                      value={lang.code}
                      onSelect={handleSelect}
                    >
                      <span className="flex-1">
                        {showNativeName ? lang.nativeName : lang.name}
                      </span>
                      {lang.code === locale && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  if (variant === 'button') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn('justify-start gap-2', className)}>
            <Languages className="h-4 w-4" />
            <span>{currentLanguage?.nativeName || locale}</span>
            <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={`${t.common.search}...`}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No language found.</CommandEmpty>
              {translatedLanguages.length > 0 && (
                <CommandGroup heading="Fully translated">
                  {translatedLanguages.map((lang) => (
                    <CommandItem
                      key={lang.code}
                      value={lang.code}
                      onSelect={handleSelect}
                    >
                      <span className="flex-1">
                        {showNativeName ? lang.nativeName : lang.name}
                        {showNativeName && (
                          <span className="text-muted-foreground ml-2 text-sm">
                            ({lang.name})
                          </span>
                        )}
                      </span>
                      {lang.code === locale && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {otherLanguages.length > 0 && (
                <CommandGroup heading="Other languages">
                  {otherLanguages.map((lang) => (
                    <CommandItem
                      key={lang.code}
                      value={lang.code}
                      onSelect={handleSelect}
                    >
                      <span className="flex-1">
                        {showNativeName ? lang.nativeName : lang.name}
                        {showNativeName && (
                          <span className="text-muted-foreground ml-2 text-sm">
                            ({lang.name})
                          </span>
                        )}
                      </span>
                      {lang.code === locale && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Default dropdown variant
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-[200px] justify-between', className)}
        >
          <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate flex-1 text-left">
            {currentLanguage?.nativeName || locale}
          </span>
          <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput
            placeholder={`${t.common.search}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            {translatedLanguages.length > 0 && (
              <CommandGroup heading="Fully translated">
                {translatedLanguages.map((lang) => (
                  <CommandItem
                    key={lang.code}
                    value={lang.code}
                    onSelect={handleSelect}
                    className="flex items-center"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 mr-2',
                        locale === lang.code ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex-1">
                      {showNativeName ? lang.nativeName : lang.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {lang.code}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {otherLanguages.length > 0 && (
              <CommandGroup heading="Other languages (English fallback)">
                {otherLanguages.map((lang) => (
                  <CommandItem
                    key={lang.code}
                    value={lang.code}
                    onSelect={handleSelect}
                    className="flex items-center"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 mr-2',
                        locale === lang.code ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex-1">
                      {showNativeName ? lang.nativeName : lang.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {lang.code}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
