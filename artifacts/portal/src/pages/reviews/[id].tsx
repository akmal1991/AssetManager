import React, { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, Send, FileText, User, ClipboardCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button, Card, Textarea, PageTransition, LoadingSpinner, Input, Badge } from "@/components/ui/shared";
import { useGetReview, useSubmitReview } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getLocalizedLiteratureType, getLocalizedReviewVerdict } from "@/lib/utils";
import { useLocale, type Locale } from "@/lib/i18n";

type FormState = {
  authors: string;
  title: string;
  literatureType: string;
  specialty: string;
  educationLevel: string;
  departmentFaculty: string;
  literatureTypeNote: string;
  curriculumCompliance: string;
  curriculumNote: string;
  syllabusCompliance: string;
  syllabusNote: string;
  purposeRelevance: string;
  scientificLevel: string;
  structurePresentation: string;
  universityImportance: string;
  universityImportanceBasis: string;
  regulatoryCompliance: string;
  regulatoryNote: string;
  scientificity: string;
  sources: string;
  languageStyle: string;
  practicalImportance: string;
  finalRecommendation: string;
  finalNote: string;
  expertFullName: string;
  expertDegree: string;
  workplace: string;
  signature: string;
  signedDate: string;
  confidentialEditorNote: string;
  scientificSignificanceScore: string;
  methodologyScore: string;
  structureClarityScore: string;
  originalityScore: string;
};

const initialForm: FormState = {
  authors: "",
  title: "",
  literatureType: "",
  specialty: "",
  educationLevel: "",
  departmentFaculty: "",
  literatureTypeNote: "",
  curriculumCompliance: "",
  curriculumNote: "",
  syllabusCompliance: "",
  syllabusNote: "",
  purposeRelevance: "",
  scientificLevel: "",
  structurePresentation: "",
  universityImportance: "",
  universityImportanceBasis: "",
  regulatoryCompliance: "",
  regulatoryNote: "",
  scientificity: "",
  sources: "",
  languageStyle: "",
  practicalImportance: "",
  finalRecommendation: "",
  finalNote: "",
  expertFullName: "",
  expertDegree: "",
  workplace: "",
  signature: "",
  signedDate: new Date().toISOString().slice(0, 10),
  confidentialEditorNote: "",
  scientificSignificanceScore: "",
  methodologyScore: "",
  structureClarityScore: "",
  originalityScore: "",
};

const copy = {
  title: {
    uz: "ILMIY VA O'QUV ADABIYOTLARNI EKSPERTIZADAN O'TKAZISH BO'YICHA EKSPERT XULOSASI",
    en: "EXPERT CONCLUSION FOR THE REVIEW OF SCIENTIFIC AND EDUCATIONAL LITERATURE",
    ru: "ЭКСПЕРТНОЕ ЗАКЛЮЧЕНИЕ ПО ЭКСПЕРТИЗЕ НАУЧНОЙ И УЧЕБНОЙ ЛИТЕРАТУРЫ",
  },
  section1: { uz: "1. Umumiy ma'lumotlar", en: "1. General information", ru: "1. Общие сведения" },
  section2: { uz: "2. Adabiyot turini aniqlash", en: "2. Literature type", ru: "2. Тип литературы" },
  section3: { uz: "3. O'quv rejaga mosligi", en: "3. Compliance with curriculum", ru: "3. Соответствие учебному плану" },
  section4: { uz: "4. Sillabus asosida tuzilganligi", en: "4. Compliance with syllabus", ru: "4. Соответствие силлабусу" },
  section5: { uz: "5. Asarning maqsadi va dolzarbligi", en: "5. Purpose and relevance of the work", ru: "5. Цель и актуальность работы" },
  section6: { uz: "6. Ilmiy darajasi va mazmuni", en: "6. Scientific level and content", ru: "6. Научный уровень и содержание" },
  section7: { uz: "7. Tuzilishi va bayoni", en: "7. Structure and presentation", ru: "7. Структура и изложение" },
  section8: { uz: "8. Universitet uchun ahamiyati", en: "8. Importance for the university", ru: "8. Значимость для университета" },
  section9: { uz: "9. Normativ hujjatlarga muvofiqligi (2025-yil 22-avgust, 530-son qaror)", en: "9. Compliance with regulations (Resolution No. 530, 22 August 2025)", ru: "9. Соответствие нормативным документам (Постановление N 530 от 22 августа 2025 г.)" },
  section10: { uz: "10. Mazmun va ilmiy-uslubiy darajasi", en: "10. Content and scientific-methodical level", ru: "10. Содержание и научно-методический уровень" },
  section11: { uz: "11. Umumiy xulosa", en: "11. Overall conclusion", ru: "11. Общее заключение" },
  section12: { uz: "12. Ekspert ma'lumotlari", en: "12. Expert information", ru: "12. Сведения об эксперте" },
  note: { uz: "Izoh", en: "Comment", ru: "Примечание" },
  basis: { uz: "Asos", en: "Basis", ru: "Основание" },
  confidential: { uz: "Ekspert jarayoni uchun yopiq izoh", en: "Confidential note for the expert workflow", ru: "Конфиденциальное примечание для экспертного процесса" },
  submit: { uz: "Ekspert xulosasini yuborish", en: "Submit expert conclusion", ru: "Отправить экспертное заключение" },
  saveDraft: { uz: "Qoralamani saqlash", en: "Save draft", ru: "Сохранить черновик" },
  sectionScores: { uz: "Baholash ballari", en: "Evaluation scores", ru: "Оценочные баллы" },
} as const;

const fieldLabels = {
  authors: { uz: "Muallif(lar)", en: "Author(s)", ru: "Автор(ы)" },
  title: { uz: "Adabiyot nomi", en: "Literature title", ru: "Название литературы" },
  literatureType: { uz: "Adabiyot turi", en: "Literature type", ru: "Тип литературы" },
  specialty: { uz: "Mutaxassislik", en: "Specialty", ru: "Специальность" },
  educationLevel: { uz: "Ta'lim darajasi", en: "Education level", ru: "Уровень образования" },
  departmentFaculty: { uz: "Kafedra/Fakultet", en: "Department/Faculty", ru: "Кафедра/Факультет" },
  scientificity: { uz: "Ilmiylik", en: "Scientific quality", ru: "Научность" },
  sources: { uz: "Manbalar", en: "Sources", ru: "Источники" },
  languageStyle: { uz: "Til va uslub", en: "Language and style", ru: "Язык и стиль" },
  practicalImportance: { uz: "Amaliy ahamiyati", en: "Practical importance", ru: "Практическая значимость" },
  expertFullName: { uz: "F.I.Sh.", en: "Full name", ru: "Ф.И.О." },
  expertDegree: { uz: "Ilmiy daraja", en: "Academic degree", ru: "Ученая степень" },
  workplace: { uz: "Ish joyi", en: "Workplace", ru: "Место работы" },
  signature: { uz: "Imzo", en: "Signature", ru: "Подпись" },
  signedDate: { uz: "Sana", en: "Date", ru: "Дата" },
} as const;

const options = {
  literatureType: [
    { value: "darslik", label: { uz: "Darslik", en: "Textbook", ru: "Учебник" } },
    { value: "oquv_qollanma", label: { uz: "O'quv qo'llanma", en: "Study guide", ru: "Учебное пособие" } },
    { value: "oquv_uslubiy_qollanma", label: { uz: "Uslubiy qo'llanma", en: "Methodical guide", ru: "Методическое пособие" } },
    { value: "monografiya", label: { uz: "Monografiya", en: "Monograph", ru: "Монография" } },
  ],
  compliance: [
    { value: "full", label: { uz: "To'liq mos", en: "Fully compliant", ru: "Полностью соответствует" } },
    { value: "partial", label: { uz: "Qisman mos", en: "Partially compliant", ru: "Частично соответствует" } },
    { value: "none", label: { uz: "Mos emas", en: "Not compliant", ru: "Не соответствует" } },
  ],
  importance: [
    { value: "high", label: { uz: "Yuqori", en: "High", ru: "Высокая" } },
    { value: "medium", label: { uz: "O'rta", en: "Medium", ru: "Средняя" } },
    { value: "low", label: { uz: "Past", en: "Low", ru: "Низкая" } },
  ],
  finalRecommendation: [
    { value: "recommended", label: { uz: "Tavsiya etiladi", en: "Recommended", ru: "Рекомендуется" } },
    { value: "revise", label: { uz: "Qayta ishlash kerak", en: "Requires revision", ru: "Требуется доработка" } },
    { value: "reject", label: { uz: "Rad etiladi", en: "Rejected", ru: "Отклоняется" } },
  ],
} as const;

function l(value: Record<Locale, string>, locale: Locale) {
  return value[locale] ?? value.uz;
}

function optionText(group: keyof typeof options, value: string, locale: Locale) {
  return options[group].find((item) => item.value === value)?.label[locale] ?? value;
}

function getClassificationCopy(classification: string | null | undefined, locale: Locale) {
  const labels = {
    positive: { uz: "Ijobiy xulosa", en: "Positive conclusion", ru: "Положительное заключение" },
    negative: { uz: "Salbiy xulosa", en: "Negative conclusion", ru: "Отрицательное заключение" },
  } as const;
  if (!classification) return "";
  return labels[classification as keyof typeof labels]?.[locale] ?? classification;
}

function RadioGroup({
  name,
  value,
  group,
  locale,
  disabled,
  onChange,
}: {
  name: string;
  value: string;
  group: keyof typeof options;
  locale: Locale;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {options[group].map((item) => (
        <label key={item.value} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${value === item.value ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-white text-slate-700"}`}>
          <input type="radio" name={name} value={item.value} checked={value === item.value} onChange={() => onChange(item.value)} disabled={disabled} />
          {item.label[locale]}
        </label>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 border border-border shadow-sm bg-white">
      <h3 className="text-lg font-bold font-serif mb-5 text-slate-900 border-b border-slate-100 pb-3">{title}</h3>
      {children}
    </Card>
  );
}

export default function ReviewForm() {
  const [, params] = useRoute("/reviews/:id");
  const reviewId = Number(params?.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { locale, t, withLocale } = useLocale();
  const { user } = useAuth();

  const { data: review, isLoading } = useGetReview(reviewId);
  const submitMutation = useSubmitReview();
  const reviewData = review as any;

  const [form, setForm] = useState<FormState>(initialForm);

  React.useEffect(() => {
    if (!reviewData) return;
    const saved = reviewData.conclusionForm && typeof reviewData.conclusionForm === "object" ? reviewData.conclusionForm : {};
    setForm({
      ...initialForm,
      ...saved,
      authors: saved.authors || reviewData.submission?.authorName || "",
      title: saved.title || reviewData.submissionTitle || "",
      literatureType: saved.literatureType || reviewData.submission?.literatureType || "",
      specialty: saved.specialty || reviewData.submission?.scientificDirection || "",
      departmentFaculty: saved.departmentFaculty || "",
      expertFullName: saved.expertFullName || reviewData.reviewerName || "",
      expertDegree: saved.expertDegree || "",
      signedDate: saved.signedDate || new Date().toISOString().slice(0, 10),
      scientificSignificanceScore: saved.scientificSignificanceScore || String(reviewData.scientificSignificance ?? ""),
      methodologyScore: saved.methodologyScore || String(reviewData.methodology ?? ""),
      structureClarityScore: saved.structureClarityScore || String(reviewData.structureClarity ?? ""),
      originalityScore: saved.originalityScore || String(reviewData.originality ?? ""),
    });
  }, [reviewData]);

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const getPayload = () => ({
    conclusionForm: form,
    conclusionSummary: form.purposeRelevance,
    strengths: form.scientificLevel,
    weaknesses: form.structurePresentation,
    recommendation: form.finalRecommendation ? optionText("finalRecommendation", form.finalRecommendation, locale) : "",
    commentsForAuthor: form.finalNote,
    commentsForEditor: form.confidentialEditorNote,
    scientificSignificance: form.scientificSignificanceScore || undefined,
    methodology: form.methodologyScore || undefined,
    structureClarity: form.structureClarityScore || undefined,
    originality: form.originalityScore || undefined,
    verdict: form.finalRecommendation === "recommended" ? "accept" : form.finalRecommendation === "revise" ? "major_revision" : form.finalRecommendation === "reject" ? "reject" : undefined,
  });

  const validateScores = () => {
    const scores = [form.scientificSignificanceScore, form.methodologyScore, form.structureClarityScore, form.originalityScore];
    return scores.every((value) => {
      const numberValue = Number(value);
      return Number.isInteger(numberValue) && numberValue >= 1 && numberValue <= 10;
    });
  };

  const handleSaveDraft = async () => {
    try {
      const token = localStorage.getItem("portal_token");
      const response = await fetch(`/api/reviews/${reviewId}/draft`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(getPayload()),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save draft");
      }
      toast({
        title: t({ uz: "Qoralama saqlandi", en: "Draft saved", ru: "Черновик сохранен" }),
        description: t({ uz: "Ekspert xulosasi qoralama sifatida saqlandi.", en: "The expert conclusion was saved as a draft.", ru: "Экспертное заключение сохранено как черновик." }),
      });
    } catch (error: any) {
      toast({
        title: t({ uz: "Xatolik", en: "Error", ru: "Ошибка" }),
        description: error?.message || t({ uz: "Qoralamani saqlab bo'lmadi", en: "Failed to save draft", ru: "Не удалось сохранить черновик" }),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.finalRecommendation || !form.purposeRelevance || !form.finalNote || !validateScores()) {
      toast({
        title: t({ uz: "Majburiy maydonlar", en: "Required fields", ru: "Обязательные поля" }),
        description: t({
          uz: "Asarning maqsadi, umumiy xulosa, yakuniy tavsiya va 1-10 oralig'idagi ballarni to'ldiring.",
          en: "Fill in the purpose, overall conclusion, final recommendation, and all 1-10 scores.",
          ru: "Заполните цель работы, общее заключение и итоговую рекомендацию.",
        }),
        variant: "destructive",
      });
      return;
    }

    try {
      await submitMutation.mutateAsync({
        id: reviewId,
        data: {
          ...getPayload(),
        } as any,
      });
      toast({
        title: t({ uz: "Muvaffaqiyatli", en: "Success", ru: "Успешно" }),
        description: t({ uz: "Ekspert xulosasi yuborildi", en: "Expert conclusion submitted", ru: "Экспертное заключение отправлено" }),
      });
      setLocation(withLocale("/dashboard/expert/history"));
    } catch (error: any) {
      toast({
        title: t({ uz: "Xatolik", en: "Error", ru: "Ошибка" }),
        description: error?.message || t({ uz: "Saqlashda xatolik", en: "Failed to save conclusion", ru: "Не удалось сохранить заключение" }),
        variant: "destructive",
      });
    }
  };

  if (isLoading || !reviewData) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  const isExpertOwner = user?.role === "reviewer" && reviewData.reviewerId === user.id;
  const isReadOnly = reviewData.status === "submitted" || !isExpertOwner;
  const currentRole = user?.role as string | undefined;
  const backPath = currentRole === "author" ? "/dashboard/author" : currentRole === "publisher" ? "/dashboard/publisher" : "/dashboard/expert";

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="max-w-5xl mx-auto py-6">
          <Link href={withLocale(backPath)} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary mb-6 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t({ uz: "Ortga qaytish", en: "Back", ru: "Назад" })}
          </Link>

          <div className="mb-6 rounded-3xl bg-white border border-border shadow-sm p-8 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500 mb-3">
              {t({ uz: "Universitet Nashriyot Portali", en: "University Publishing Portal", ru: "Университетский издательский портал" })}
            </p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-primary leading-tight">{l(copy.title, locale)}</h2>
            {reviewData.status === "submitted" && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Badge className={reviewData.classification === "positive" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
                  {getClassificationCopy(reviewData.classification, locale)}
                </Badge>
                <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                  {getLocalizedReviewVerdict(reviewData.verdict, locale)}
                </Badge>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Section title={l(copy.section1, locale)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["authors", "title", "literatureType", "specialty", "educationLevel", "departmentFaculty"] as const).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{l(fieldLabels[key], locale)}</label>
                    <Input value={form[key]} onChange={(event) => update(key, event.target.value)} disabled={isReadOnly || key === "title"} />
                  </div>
                ))}
              </div>
            </Section>

            <Section title={l(copy.section2, locale)}>
              <RadioGroup name="literatureType" value={form.literatureType} group="literatureType" locale={locale} disabled={isReadOnly} onChange={(value) => update("literatureType", value)} />
              <Textarea value={form.literatureTypeNote} onChange={(event) => update("literatureTypeNote", event.target.value)} disabled={isReadOnly} className="mt-4" placeholder={l(copy.note, locale)} />
            </Section>

            <Section title={l(copy.section3, locale)}>
              <RadioGroup name="curriculumCompliance" value={form.curriculumCompliance} group="compliance" locale={locale} disabled={isReadOnly} onChange={(value) => update("curriculumCompliance", value)} />
              <Textarea value={form.curriculumNote} onChange={(event) => update("curriculumNote", event.target.value)} disabled={isReadOnly} className="mt-4" placeholder={l(copy.note, locale)} />
            </Section>

            <Section title={l(copy.section4, locale)}>
              <RadioGroup name="syllabusCompliance" value={form.syllabusCompliance} group="compliance" locale={locale} disabled={isReadOnly} onChange={(value) => update("syllabusCompliance", value)} />
              <Textarea value={form.syllabusNote} onChange={(event) => update("syllabusNote", event.target.value)} disabled={isReadOnly} className="mt-4" placeholder={l(copy.note, locale)} />
            </Section>

            <Section title={l(copy.section5, locale)}>
              <p className="text-sm text-slate-500 mb-3">
                {t({
                  uz: "Asarning asosiy maqsadi, mavzuning dolzarbligi va bugungi kun talablariga mosligini bayon qiling.",
                  en: "Describe the main purpose, relevance of the topic, and compliance with current requirements.",
                  ru: "Опишите основную цель, актуальность темы и соответствие современным требованиям.",
                })}
              </p>
              <Textarea value={form.purposeRelevance} onChange={(event) => update("purposeRelevance", event.target.value)} disabled={isReadOnly} className="min-h-[130px]" />
            </Section>

            <Section title={l(copy.section6, locale)}>
              <p className="text-sm text-slate-500 mb-3">
                {t({
                  uz: "Materialning ilmiy asoslanganligi, nazariy va amaliy jihatlari, manbalardan foydalanish darajasini baholang.",
                  en: "Evaluate scientific grounding, theoretical and practical aspects, and use of sources.",
                  ru: "Оцените научную обоснованность, теоретические и практические аспекты, использование источников.",
                })}
              </p>
              <Textarea value={form.scientificLevel} onChange={(event) => update("scientificLevel", event.target.value)} disabled={isReadOnly} className="min-h-[130px]" />
            </Section>

            <Section title={l(copy.section7, locale)}>
              <p className="text-sm text-slate-500 mb-3">
                {t({
                  uz: "Materialning mantiqiy ketma-ketligi, bob va bo'limlarning joylashuvi hamda tushunarliligini yozing.",
                  en: "Describe logical sequence, chapter/section arrangement, and clarity.",
                  ru: "Опишите логическую последовательность, расположение глав и разделов, понятность изложения.",
                })}
              </p>
              <Textarea value={form.structurePresentation} onChange={(event) => update("structurePresentation", event.target.value)} disabled={isReadOnly} className="min-h-[130px]" />
            </Section>

            <Section title={l(copy.section8, locale)}>
              <RadioGroup name="universityImportance" value={form.universityImportance} group="importance" locale={locale} disabled={isReadOnly} onChange={(value) => update("universityImportance", value)} />
              <Textarea value={form.universityImportanceBasis} onChange={(event) => update("universityImportanceBasis", event.target.value)} disabled={isReadOnly} className="mt-4" placeholder={l(copy.basis, locale)} />
            </Section>

            <Section title={l(copy.section9, locale)}>
              <RadioGroup name="regulatoryCompliance" value={form.regulatoryCompliance} group="compliance" locale={locale} disabled={isReadOnly} onChange={(value) => update("regulatoryCompliance", value)} />
              <Textarea value={form.regulatoryNote} onChange={(event) => update("regulatoryNote", event.target.value)} disabled={isReadOnly} className="mt-4" placeholder={l(copy.note, locale)} />
            </Section>

            <Section title={l(copy.section10, locale)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["scientificity", "sources", "languageStyle", "practicalImportance"] as const).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{l(fieldLabels[key], locale)}</label>
                    <Textarea value={form[key]} onChange={(event) => update(key, event.target.value)} disabled={isReadOnly} className="min-h-[110px]" />
                  </div>
                ))}
              </div>
            </Section>

            <Section title={l(copy.sectionScores, locale)}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { key: "scientificSignificanceScore", label: t({ uz: "Ilmiy ahamiyat", en: "Scientific significance", ru: "Научная значимость" }) },
                  { key: "methodologyScore", label: t({ uz: "Metodologiya", en: "Methodology", ru: "Методология" }) },
                  { key: "structureClarityScore", label: t({ uz: "Tuzilish ravshanligi", en: "Structure clarity", ru: "Ясность структуры" }) },
                  { key: "originalityScore", label: t({ uz: "Originalligi", en: "Originality", ru: "Оригинальность" }) },
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{item.label}</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={form[item.key as keyof FormState]}
                      onChange={(event) => update(item.key as keyof FormState, event.target.value)}
                      disabled={isReadOnly}
                      placeholder="1-10"
                    />
                  </div>
                ))}
              </div>
            </Section>

            <Section title={l(copy.section11, locale)}>
              <RadioGroup name="finalRecommendation" value={form.finalRecommendation} group="finalRecommendation" locale={locale} disabled={isReadOnly} onChange={(value) => update("finalRecommendation", value)} />
              <Textarea value={form.finalNote} onChange={(event) => update("finalNote", event.target.value)} disabled={isReadOnly} className="mt-4 min-h-[120px]" placeholder={l(copy.note, locale)} />
              <Textarea value={form.confidentialEditorNote} onChange={(event) => update("confidentialEditorNote", event.target.value)} disabled={isReadOnly} className="mt-4 bg-amber-50/50 border-amber-200" placeholder={l(copy.confidential, locale)} />
            </Section>

            <Section title={l(copy.section12, locale)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["expertFullName", "expertDegree", "workplace", "signature", "signedDate"] as const).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{l(fieldLabels[key], locale)}</label>
                    <Input type={key === "signedDate" ? "date" : "text"} value={form[key]} onChange={(event) => update(key, event.target.value)} disabled={isReadOnly} />
                  </div>
                ))}
              </div>
            </Section>

            {!isReadOnly && (
              <div className="flex flex-col sm:flex-row justify-end gap-3 sticky bottom-6 z-10">
                <Button type="button" size="lg" variant="outline" className="shadow-lg bg-white text-lg px-8 h-14" onClick={handleSaveDraft} disabled={submitMutation.isPending}>
                  <Save className="mr-3 h-5 w-5" />
                  {l(copy.saveDraft, locale)}
                </Button>
                <Button type="submit" size="lg" className="shadow-xl shadow-primary/30 text-lg px-10 h-14 bg-primary text-white hover:bg-primary/90" disabled={submitMutation.isPending}>
                  <Send className="mr-3 h-5 w-5" />
                  {submitMutation.isPending ? t({ uz: "Yuborilmoqda...", en: "Submitting...", ru: "Отправка..." }) : l(copy.submit, locale)}
                </Button>
              </div>
            )}
          </form>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
