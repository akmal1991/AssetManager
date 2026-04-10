import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_LOCALE, getIntlLocale, type Locale } from "@/lib/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | undefined | null, locale: Locale = DEFAULT_LOCALE) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

export const LITERATURE_TYPE_LABELS = {
  darslik: { uz: "Darslik", en: "Textbook", ru: "Учебник" },
  oquv_qollanma: { uz: "O'quv qo'llanma", en: "Study guide", ru: "Учебное пособие" },
  monografiya: { uz: "Monografiya", en: "Monograph", ru: "Монография" },
  oquv_uslubiy_qollanma: {
    uz: "O'quv uslubiy qo'llanma",
    en: "Teaching guide",
    ru: "Учебно-методическое пособие",
  },
  uslubiy_korsatma: { uz: "Uslubiy ko'rsatma", en: "Methodical guide", ru: "Методические указания" },
} as const;

export const STATUS_LABELS_BY_LOCALE = {
  submitted: { uz: "Yuborildi", en: "Submitted", ru: "Отправлено" },
  under_review: { uz: "Ko'rib chiqilmoqda", en: "Under review", ru: "На рассмотрении" },
  revision_required: { uz: "Tuzatish kerak", en: "Revision required", ru: "Требуется доработка" },
  accepted: { uz: "Qabul qilindi", en: "Accepted", ru: "Принято" },
  rejected: { uz: "Rad etildi", en: "Rejected", ru: "Отклонено" },
  published: { uz: "Nashr etildi", en: "Published", ru: "Опубликовано" },
} as const;

export const REVIEW_VERDICT_LABELS = {
  accept: { uz: "Qabul qilish", en: "Accept", ru: "Принять" },
  minor_revision: { uz: "Kichik tuzatishlar", en: "Minor revision", ru: "Небольшие правки" },
  major_revision: { uz: "Katta tuzatishlar", en: "Major revision", ru: "Серьезная доработка" },
  reject: { uz: "Rad etish", en: "Reject", ru: "Отклонить" },
} as const;

export const ROLE_LABELS_BY_LOCALE = {
  author: { uz: "Muallif", en: "Author", ru: "Автор" },
  editor: { uz: "Muharrir", en: "Editor", ru: "Редактор" },
  reviewer: { uz: "Taqrizchi", en: "Reviewer", ru: "Рецензент" },
  admin: { uz: "Administrator", en: "Administrator", ru: "Администратор" },
} as const;

export const LITERATURE_TYPES = Object.fromEntries(
  Object.entries(LITERATURE_TYPE_LABELS).map(([key, labels]) => [key, labels.uz]),
) as Record<string, string>;

export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS_LABELS_BY_LOCALE).map(([key, labels]) => [key, labels.uz]),
) as Record<string, string>;

export const STATUS_COLORS = {
  submitted: "bg-blue-100 text-blue-800 border-blue-200",
  under_review: "bg-amber-100 text-amber-800 border-amber-200",
  revision_required: "bg-orange-100 text-orange-800 border-orange-200",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  published: "bg-purple-100 text-purple-800 border-purple-200",
};

export function getLocalizedLiteratureType(type: string | undefined | null, locale: Locale = DEFAULT_LOCALE) {
  if (!type) return "N/A";
  return LITERATURE_TYPE_LABELS[type as keyof typeof LITERATURE_TYPE_LABELS]?.[locale] ?? type;
}

export function getLocalizedStatusLabel(status: string | undefined | null, locale: Locale = DEFAULT_LOCALE) {
  if (!status) return "N/A";
  return STATUS_LABELS_BY_LOCALE[status as keyof typeof STATUS_LABELS_BY_LOCALE]?.[locale] ?? status;
}

export function getLocalizedReviewVerdict(verdict: string | undefined | null, locale: Locale = DEFAULT_LOCALE) {
  if (!verdict) return "N/A";
  return REVIEW_VERDICT_LABELS[verdict as keyof typeof REVIEW_VERDICT_LABELS]?.[locale] ?? verdict;
}

export function getLocalizedRoleLabel(role: string | undefined | null, locale: Locale = DEFAULT_LOCALE) {
  if (!role) return "N/A";
  return ROLE_LABELS_BY_LOCALE[role as keyof typeof ROLE_LABELS_BY_LOCALE]?.[locale] ?? role;
}
