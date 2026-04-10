import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetReview, useSubmitReview } from "@workspace/api-client-react";
import { Button, Card, Textarea, PageTransition, LoadingSpinner } from "@/components/ui/shared";
import { useRoute, useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, CheckCircle, Edit3, AlertTriangle, XCircle, FileText, User } from "lucide-react";
import { getLocalizedLiteratureType, getLocalizedReviewVerdict } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

const VERDICT_STYLES = {
  accept: "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20 shadow-sm",
  minor_revision: "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 shadow-sm",
  major_revision: "border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-500/20 shadow-sm",
  reject: "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/20 shadow-sm",
};

const VERDICT_ICON_STYLES = {
  accept: "text-emerald-600",
  minor_revision: "text-blue-600",
  major_revision: "text-orange-600",
  reject: "text-red-600",
};

export default function ReviewForm() {
  const [, params] = useRoute("/reviews/:id");
  const reviewId = Number(params?.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { locale, t, withLocale } = useLocale();

  const { data: review, isLoading } = useGetReview(reviewId);
  const submitMutation = useSubmitReview();

  const [scores, setScores] = useState({
    scientificSignificance: 5,
    methodology: 5,
    structureClarity: 5,
    originality: 5,
  });

  const [comments, setComments] = useState({
    commentsForAuthor: "",
    commentsForEditor: "",
  });
  const [verdict, setVerdict] = useState<any>("");

  React.useEffect(() => {
    if (review?.status === "submitted") {
      setScores({
        scientificSignificance: review.scientificSignificance || 5,
        methodology: review.methodology || 5,
        structureClarity: review.structureClarity || 5,
        originality: review.originality || 5,
      });
      setComments({
        commentsForAuthor: review.commentsForAuthor || "",
        commentsForEditor: review.commentsForEditor || "",
      });
      setVerdict(review.verdict);
    }
  }, [review]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verdict) {
      toast({
        title: t({ uz: "Diqqat", en: "Attention", ru: "Внимание" }),
        description: t({ uz: "Yakuniy xulosani tanlang", en: "Select a final verdict", ru: "Выберите итоговый вердикт" }),
        variant: "destructive",
      });
      return;
    }

    try {
      await submitMutation.mutateAsync({
        id: reviewId,
        data: {
          ...scores,
          ...comments,
          verdict,
        },
      });
      toast({
        title: t({ uz: "Muvaffaqiyatli", en: "Success", ru: "Успешно" }),
        description: t({ uz: "Taqriz yuborildi", en: "Review submitted", ru: "Рецензия отправлена" }),
      });
      setLocation(withLocale("/dashboard/reviewer"));
    } catch {
      toast({
        title: t({ uz: "Xatolik", en: "Error", ru: "Ошибка" }),
        description: t({ uz: "Saqlashda xatolik", en: "Failed to save review", ru: "Не удалось сохранить рецензию" }),
        variant: "destructive",
      });
    }
  };

  const handleScoreChange = (key: string, value: number) => {
    if (value >= 1 && value <= 10) {
      setScores({ ...scores, [key]: value });
    }
  };

  if (isLoading || !review) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  const isReadOnly = review.status === "submitted";

  const verdictOptions = [
    { id: "accept", label: t({ uz: "Qabul qilish", en: "Accept", ru: "Принять" }), icon: CheckCircle },
    { id: "minor_revision", label: t({ uz: "Kichik tuzatishlar", en: "Minor revision", ru: "Небольшие правки" }), icon: Edit3 },
    { id: "major_revision", label: t({ uz: "Katta tuzatishlar", en: "Major revision", ru: "Серьезная доработка" }), icon: AlertTriangle },
    { id: "reject", label: t({ uz: "Rad etish", en: "Reject", ru: "Отклонить" }), icon: XCircle },
  ] as const;

  const scoreLabels = {
    scientificSignificance: t({ uz: "Ilmiy ahamiyati va dolzarbligi", en: "Scientific value and relevance", ru: "Научная значимость и актуальность" }),
    methodology: t({ uz: "Metodologiya va yondashuv", en: "Methodology and approach", ru: "Методология и подход" }),
    structureClarity: t({ uz: "Tuzilishi va fikrning aniqligi", en: "Structure and clarity", ru: "Структура и ясность изложения" }),
    originality: t({ uz: "Originallik va yangilik darajasi", en: "Originality and novelty", ru: "Оригинальность и новизна" }),
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="max-w-4xl mx-auto py-6">
          <Link href={withLocale("/dashboard/reviewer")} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary mb-6 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t({ uz: "Ortga qaytish", en: "Back", ru: "Назад" })}
          </Link>

          <div className="mb-6">
            <h2 className="text-3xl font-serif font-bold text-primary">
              {t({ uz: "Ekspert Taqrizi", en: "Review form", ru: "Форма рецензии" })}
            </h2>
          </div>

          <Card className="p-6 mb-8 border border-border shadow-md bg-white">
            <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-slate-800">
              <FileText className="h-5 w-5 text-primary" />
              {t({ uz: "Asar ma'lumotlari", en: "Submission details", ru: "Данные о работе" })}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <p className="text-slate-500 mb-1">{t({ uz: "Asar nomi", en: "Title", ru: "Название работы" })}</p>
                <p className="font-semibold text-slate-900">{review.submissionTitle}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">{t({ uz: "Adabiyot turi", en: "Literature type", ru: "Тип литературы" })}</p>
                <p className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded inline-block">
                  {getLocalizedLiteratureType(review.submission?.literatureType, locale)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">{t({ uz: "Ilmiy yo'nalish", en: "Scientific direction", ru: "Научное направление" })}</p>
                <p className="font-medium text-slate-900">
                  {review.submission?.scientificDirection || t({ uz: "Noma'lum", en: "Unknown", ru: "Неизвестно" })}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1 flex items-center gap-1"><User className="h-4 w-4" />{t({ uz: "Muallif", en: "Author", ru: "Автор" })}</p>
                <p className="font-medium text-slate-900">
                  {review.submission?.authorName || t({ uz: "Noma'lum", en: "Unknown", ru: "Неизвестно" })}
                </p>
              </div>
            </div>
          </Card>

          <form onSubmit={handleSubmit}>
            <Card className="p-8 mb-6 shadow-sm border border-border bg-white">
              <h3 className="text-lg font-bold font-serif mb-6 border-b border-slate-100 pb-2 text-slate-800">
                {t({ uz: "1. Baholash (1-10)", en: "1. Scoring (1-10)", ru: "1. Оценка (1-10)" })}
              </h3>
              <div className="space-y-8">
                {Object.entries(scoreLabels).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-3">
                      <label className="font-medium text-slate-700">{label}</label>
                      <div className="flex items-center gap-3">
                        <button type="button" disabled={isReadOnly} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-50" onClick={() => handleScoreChange(key, scores[key as keyof typeof scores] - 1)}>-</button>
                        <span className="text-xl font-bold font-serif text-primary w-10 text-center">{scores[key as keyof typeof scores]}</span>
                        <button type="button" disabled={isReadOnly} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-50" onClick={() => handleScoreChange(key, scores[key as keyof typeof scores] + 1)}>+</button>
                      </div>
                    </div>
                    <div className="relative pt-2">
                      <input type="range" min="1" max="10" value={scores[key as keyof typeof scores]} onChange={(event) => setScores({ ...scores, [key]: Number(event.target.value) })} disabled={isReadOnly} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                      <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">{Array.from({ length: 10 }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 mb-6 shadow-sm border border-border bg-white">
              <h3 className="text-lg font-bold font-serif mb-6 border-b border-slate-100 pb-2 text-slate-800">
                {t({ uz: "2. Fikr va mulohazalar", en: "2. Comments", ru: "2. Комментарии" })}
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block font-medium mb-2 text-slate-700">
                    {t({ uz: "Muallif uchun izohlar", en: "Comments for the author", ru: "Комментарии для автора" })}
                    <span className="text-slate-400 font-normal text-sm ml-1">
                      {t({ uz: "(Muallif buni ko'radi)", en: "(Visible to the author)", ru: "(Автор это увидит)" })}
                    </span>
                  </label>
                  <Textarea value={comments.commentsForAuthor} onChange={(event) => setComments({ ...comments, commentsForAuthor: event.target.value })} disabled={isReadOnly} className="min-h-[150px] bg-slate-50" placeholder={t({ uz: "Ishning kuchli va zaif tomonlari, tuzatish bo'yicha takliflar...", en: "Strengths, weaknesses, and revision suggestions...", ru: "Сильные и слабые стороны работы, предложения по доработке..." })} />
                </div>
                <div>
                  <label className="block font-medium mb-2 text-slate-700">
                    {t({ uz: "Muharrir uchun yopiq izohlar", en: "Confidential comments for the editor", ru: "Конфиденциальные комментарии для редактора" })}
                    <span className="text-slate-400 font-normal text-sm ml-1">
                      {t({ uz: "(Faqat muharrir ko'radi)", en: "(Visible only to the editor)", ru: "(Видно только редактору)" })}
                    </span>
                  </label>
                  <Textarea value={comments.commentsForEditor} onChange={(event) => setComments({ ...comments, commentsForEditor: event.target.value })} disabled={isReadOnly} className="min-h-[100px] bg-amber-50/50 border-amber-200 focus-visible:ring-amber-500" placeholder={t({ uz: "Qo'shimcha maxfiy xulosalar...", en: "Additional confidential remarks...", ru: "Дополнительные конфиденциальные замечания..." })} />
                </div>
              </div>
            </Card>

            <Card className="p-8 mb-8 border-t-4 border-t-primary shadow-md bg-white">
              <h3 className="text-lg font-bold font-serif mb-6 text-slate-800">
                {t({ uz: "3. Yakuniy xulosa", en: "3. Final verdict", ru: "3. Итоговый вердикт" })}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {verdictOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`cursor-pointer flex flex-col items-center justify-center p-6 rounded-xl border-2 font-bold text-center transition-all ${
                      verdict === option.id ? VERDICT_STYLES[option.id] : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <input type="radio" name="verdict" className="hidden" value={option.id} checked={verdict === option.id} onChange={() => setVerdict(option.id)} disabled={isReadOnly} />
                    <option.icon className={`h-8 w-8 mb-3 ${verdict === option.id ? VERDICT_ICON_STYLES[option.id] : "text-slate-400"}`} />
                    {option.label}
                  </label>
                ))}
              </div>
              {isReadOnly && verdict && (
                <p className="mt-5 text-sm text-slate-500">
                  {t({ uz: "Saqlangan xulosa", en: "Saved verdict", ru: "Сохраненный вердикт" })}: {getLocalizedReviewVerdict(verdict, locale)}
                </p>
              )}
            </Card>

            {!isReadOnly && (
              <div className="flex justify-end sticky bottom-6 z-10">
                <Button type="submit" size="lg" className="shadow-xl shadow-primary/30 text-lg px-10 h-14 bg-primary text-white hover:bg-primary/90" disabled={submitMutation.isPending}>
                  <Send className="mr-3 h-5 w-5" />
                  {submitMutation.isPending
                    ? t({ uz: "Yuborilmoqda...", en: "Submitting...", ru: "Отправка..." })
                    : t({ uz: "Taqrizni yuborish", en: "Submit review", ru: "Отправить рецензию" })}
                </Button>
              </div>
            )}
          </form>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
