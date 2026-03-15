import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | undefined | null) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

export const LITERATURE_TYPES = {
  darslik: "Darslik",
  oquv_qollanma: "O'quv qo'llanma",
  monografiya: "Monografiya",
  oquv_uslubiy_qollanma: "O'quv uslubiy qo'llanma",
  uslubiy_korsatma: "Uslubiy ko'rsatma",
};

export const STATUS_LABELS = {
  submitted: "Yuborildi",
  under_review: "Ko'rib chiqilmoqda",
  revision_required: "Tuzatish kerak",
  accepted: "Qabul qilindi",
  rejected: "Rad etildi",
  published: "Nashr etildi",
};

export const STATUS_COLORS = {
  submitted: "bg-blue-100 text-blue-800 border-blue-200",
  under_review: "bg-amber-100 text-amber-800 border-amber-200",
  revision_required: "bg-orange-100 text-orange-800 border-orange-200",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  published: "bg-purple-100 text-purple-800 border-purple-200",
};
