import React from "react";
import { useLocation } from "wouter";

export const SUPPORTED_LOCALES = ["uz", "en", "ru"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

type LocaleMessages = Record<Locale, string>;

export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "UZ",
  en: "EN",
  ru: "RU",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  uz: "O'zbekcha",
  en: "English",
  ru: "Русский",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && SUPPORTED_LOCALES.includes(value as Locale);
}

export function getLocaleFromPath(path: string): Locale {
  const [, maybeLocale] = path.split("/");
  return isLocale(maybeLocale) ? maybeLocale : DEFAULT_LOCALE;
}

export function stripLocaleFromPath(path: string): string {
  const [, maybeLocale, ...rest] = path.split("/");
  const cleanPath = path.split("?")[0];
  const search = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  if (!isLocale(maybeLocale)) {
    return cleanPath || "/";
  }

  const stripped = `/${rest.join("/")}`.replace(/\/+/g, "/");
  return `${stripped === "/" ? "/" : stripped.replace(/\/$/, "")}${search}`;
}

export function withLocale(path: string, locale: Locale): string {
  const normalized = stripLocaleFromPath(path || "/");
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

export function switchLocalePath(path: string, locale: Locale): string {
  return withLocale(path, locale);
}

export function getPreferredLocale(): Locale {
  const stored = window.localStorage.getItem("portal_locale");
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

export function setPreferredLocale(locale: Locale) {
  window.localStorage.setItem("portal_locale", locale);
}

export function getIntlLocale(locale: Locale) {
  if (locale === "en") return "en-US";
  if (locale === "ru") return "ru-RU";
  return "uz-UZ";
}

export function translate(locale: Locale, messages: LocaleMessages) {
  return messages[locale] ?? messages[DEFAULT_LOCALE];
}

export function createTranslator(locale: Locale) {
  return (messages: LocaleMessages) => translate(locale, messages);
}

export function useLocale() {
  const [location, setLocation] = useLocation();
  const locale = React.useMemo(() => getLocaleFromPath(location), [location]);

  const switchLocale = React.useCallback(
    (nextLocale: Locale) => {
      setPreferredLocale(nextLocale);
      setLocation(switchLocalePath(location, nextLocale));
    },
    [location, setLocation],
  );

  return {
    locale,
    location,
    t: React.useMemo(() => createTranslator(locale), [locale]),
    withLocale: React.useCallback((path: string) => withLocale(path, locale), [locale]),
    stripLocale: React.useCallback((path: string) => stripLocaleFromPath(path), []),
    switchLocale,
    localeLabel: LOCALE_LABELS[locale],
  };
}
