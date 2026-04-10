import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetReviews } from "@workspace/api-client-react";
import { Button, Card, Badge, PageTransition } from "@/components/ui/shared";
import { formatDate, getLocalizedReviewVerdict } from "@/lib/utils";
import { Link } from "wouter";
import { ClipboardEdit, FileCheck, Clock, FileText } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export default function ReviewerDashboard() {
  const { data: reviews, isLoading } = useGetReviews();
  const { locale, t, withLocale, stripLocale, location } = useLocale();

  const pending = reviews?.filter((review) => review.status === "pending") || [];
  const submitted = reviews?.filter((review) => review.status === "submitted") || [];
  const isHistory = stripLocale(location) === "/dashboard/reviewer/history";

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary">
              {isHistory
                ? t({ uz: "Taqrizlar tarixi", en: "Review history", ru: "История рецензий" })
                : t({ uz: "Ekspert Paneli", en: "Reviewer panel", ru: "Панель рецензента" })}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isHistory
                ? t({ uz: "Siz tomonidan bajarilgan barcha taqrizlar.", en: "All reviews completed by you.", ru: "Все выполненные вами рецензии." })
                : t({ uz: "Sizga biriktirilgan ishlarni baholang.", en: "Evaluate works assigned to you.", ru: "Оценивайте работы, назначенные вам." })}
            </p>
          </div>
        </div>

        {!isHistory ? (
          <div className="space-y-8 animate-in fade-in">
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-100">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold font-serif text-slate-800">
                  {t({ uz: "Kutib turgan topshiriqlar", en: "Pending assignments", ru: "Ожидающие задания" })}
                </h3>
                <Badge className="bg-orange-100 text-orange-800 border-orange-200 ml-auto">{pending.length}</Badge>
              </div>

              {isLoading ? (
                <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
              ) : pending.length === 0 ? (
                <Card className="p-16 text-center border-dashed border-2 bg-slate-50/50">
                  <FileCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">
                    {t({ uz: "Hozircha baholash uchun ishlar yo'q.", en: "There are no works waiting for review.", ru: "Сейчас нет работ для рецензирования." })}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pending.map((review) => (
                    <Card key={review.id} className="p-6 border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all bg-white flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {t({ uz: "Taqriz ID", en: "Review ID", ru: "ID рецензии" })}: #{review.id}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{formatDate(review.assignedAt, locale)}</span>
                      </div>
                      <h4 className="text-lg font-bold mb-6 text-slate-900 line-clamp-2 flex-1">{review.submissionTitle}</h4>
                      <Link href={withLocale(`/reviews/${review.id}`)}>
                        <Button className="w-full bg-primary text-white hover:bg-primary/90 shadow-sm h-12 text-base">
                          <ClipboardEdit className="mr-2 h-5 w-5" />
                          {t({ uz: "Taqriz yozishni boshlash", en: "Start review", ru: "Начать рецензию" })}
                        </Button>
                      </Link>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in">
            <section>
              <Card className="border border-border shadow-sm overflow-hidden bg-white">
                <div className="px-6 py-5 border-b border-border bg-slate-50 flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-bold font-serif text-slate-800">
                    {t({ uz: "Bajarilgan taqrizlar", en: "Completed reviews", ru: "Завершенные рецензии" })}
                  </h3>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 ml-auto">{submitted.length}</Badge>
                </div>

                {isLoading ? (
                  <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : submitted.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                    <FileText className="h-12 w-12 text-slate-300 mb-4" />
                    {t({ uz: "Tarix bo'sh.", en: "History is empty.", ru: "История пуста." })}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs tracking-wider border-b border-border">
                        <tr>
                          <th className="px-6 py-4 font-semibold w-1/2">{t({ uz: "Sarlavha", en: "Title", ru: "Название" })}</th>
                          <th className="px-6 py-4 font-semibold">{t({ uz: "Sana", en: "Date", ru: "Дата" })}</th>
                          <th className="px-6 py-4 font-semibold">{t({ uz: "Xulosa", en: "Verdict", ru: "Вердикт" })}</th>
                          <th className="px-6 py-4 font-semibold text-right">{t({ uz: "Amal", en: "Action", ru: "Действие" })}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {submitted.map((review) => (
                          <tr key={review.id} className="hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-6 py-4 font-medium text-slate-900">{review.submissionTitle}</td>
                            <td className="px-6 py-4 text-slate-600">{formatDate(review.submittedAt, locale)}</td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={`px-2.5 py-1 ${
                                review.verdict === "accept" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                review.verdict === "minor_revision" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                review.verdict === "major_revision" ? "bg-orange-50 text-orange-700 border-orange-200" :
                                "bg-red-50 text-red-700 border-red-200"
                              }`}>
                                {getLocalizedReviewVerdict(review.verdict, locale)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link href={withLocale(`/reviews/${review.id}`)}>
                                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                                  {t({ uz: "Ko'rish", en: "View", ru: "Открыть" })}
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </section>
          </div>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}
