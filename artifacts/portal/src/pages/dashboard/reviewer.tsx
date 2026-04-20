import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ClipboardEdit, FileCheck, Clock, FileText, Users } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button, Card, Badge, PageTransition } from "@/components/ui/shared";
import { useGetReviews } from "@workspace/api-client-react";
import { fetchExperts } from "@/lib/experts";
import { formatDate, getLocalizedReviewVerdict } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

function getClassificationCopy(classification: string | null | undefined, locale: "uz" | "en" | "ru") {
  const labels = {
    positive: { uz: "Ijobiy xulosa", en: "Positive conclusion", ru: "Положительное заключение" },
    negative: { uz: "Salbiy xulosa", en: "Negative conclusion", ru: "Отрицательное заключение" },
  } as const;
  if (!classification) return null;
  return labels[classification as keyof typeof labels]?.[locale] ?? classification;
}

export default function ExpertDashboard() {
  const { data: reviews, isLoading } = useGetReviews();
  const { data: experts = [] } = useQuery({ queryKey: ["experts"], queryFn: fetchExperts });
  const { locale, t, withLocale, stripLocale, location } = useLocale();

  const pending = reviews?.filter((review) => review.status === "pending") || [];
  const submitted = reviews?.filter((review) => review.status === "submitted") || [];
  const currentPath = stripLocale(location);
  const isHistory = currentPath === "/dashboard/expert/history";
  const isExperts = currentPath === "/dashboard/expert/experts";

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary">
              {isExperts
                ? t({ uz: "Ekspertlar ro'yxati", en: "Experts list", ru: "Список экспертов" })
                : isHistory
                  ? t({ uz: "Xulosalar tarixi", en: "Conclusion history", ru: "История заключений" })
                  : t({ uz: "Ekspert Paneli", en: "Expert Panel", ru: "Панель эксперта" })}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isExperts
                ? t({ uz: "Portalda faol ekspertlar tarkibi va ixtisosliklari.", en: "Active experts and their specialties in the portal.", ru: "Активные эксперты портала и их специализации." })
                : isHistory
                  ? t({ uz: "Siz tomonidan bajarilgan barcha ekspert xulosalari.", en: "All expert conclusions completed by you.", ru: "Все выполненные вами экспертные заключения." })
                  : t({ uz: "Sizga biriktirilgan ishlarni baholang.", en: "Evaluate works assigned to you.", ru: "Оценивайте работы, назначенные вам." })}
            </p>
          </div>
        </div>

        {isExperts ? (
          <Card className="border border-border shadow-sm overflow-hidden bg-white">
            <div className="px-6 py-5 border-b border-border bg-slate-50 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold font-serif text-slate-800">
                {t({ uz: "Faol ekspertlar", en: "Active experts", ru: "Активные эксперты" })}
              </h3>
              <Badge className="bg-primary/10 text-primary border-primary/20 ml-auto">{experts.length}</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
              {experts.map((expert) => (
                <Card key={expert.id} className="p-5 bg-slate-50/50 border border-slate-200 shadow-none">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{expert.fullName}</h4>
                      <p className="text-sm text-slate-500">{expert.expertOrganization || expert.departmentName || expert.email}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      {t({ uz: "Faol", en: "Active", ru: "Активен" })}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{expert.expertBio || t({ uz: "Biografiya kiritilmagan.", en: "Biography not provided.", ru: "Биография не заполнена." })}</p>
                  <div className="flex flex-wrap gap-2">
                    {(expert.expertSpecialties || []).length > 0 ? (
                      (expert.expertSpecialties || []).map((specialty) => (
                        <Badge key={specialty} className="bg-white text-slate-700 border border-slate-200">
                          {specialty}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">
                        {t({ uz: "Ixtisoslik ko'rsatilmagan", en: "No specialty specified", ru: "Специализация не указана" })}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ) : !isHistory ? (
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
                    {t({ uz: "Hozircha ekspertiza uchun ishlar yo'q.", en: "There are no works waiting for expert evaluation.", ru: "Сейчас нет работ для экспертной оценки." })}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pending.map((review) => (
                    <Card key={review.id} className="p-6 border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all bg-white flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {t({ uz: "Xulosa ID", en: "Conclusion ID", ru: "ID заключения" })}: #{review.id}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{formatDate(review.assignedAt, locale)}</span>
                      </div>
                      <h4 className="text-lg font-bold mb-2 text-slate-900 line-clamp-2">{review.submissionTitle}</h4>
                      <p className="text-sm text-slate-500 mb-6 flex-1">{(review as any).submission?.scientificDirection}</p>
                      <Link href={withLocale(`/reviews/${review.id}`)}>
                        <Button className="w-full bg-primary text-white hover:bg-primary/90 shadow-sm h-12 text-base">
                          <ClipboardEdit className="mr-2 h-5 w-5" />
                          {t({ uz: "Ekspert xulosasini boshlash", en: "Start expert conclusion", ru: "Начать экспертное заключение" })}
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
                    {t({ uz: "Bajarilgan xulosalar", en: "Completed conclusions", ru: "Завершенные заключения" })}
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
                          <th className="px-6 py-4 font-semibold w-1/3">{t({ uz: "Sarlavha", en: "Title", ru: "Название" })}</th>
                          <th className="px-6 py-4 font-semibold">{t({ uz: "Sana", en: "Date", ru: "Дата" })}</th>
                          <th className="px-6 py-4 font-semibold">{t({ uz: "Xulosa", en: "Verdict", ru: "Вердикт" })}</th>
                          <th className="px-6 py-4 font-semibold">{t({ uz: "Turkum", en: "Classification", ru: "Классификация" })}</th>
                          <th className="px-6 py-4 font-semibold text-right">{t({ uz: "Amal", en: "Action", ru: "Действие" })}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {submitted.map((review) => (
                          <tr key={review.id} className="hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-6 py-4 font-medium text-slate-900">{review.submissionTitle}</td>
                            <td className="px-6 py-4 text-slate-600">{formatDate(review.submittedAt, locale)}</td>
                            <td className="px-6 py-4">
                              <Badge className={`px-2.5 py-1 ${
                                review.verdict === "accept" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                review.verdict === "minor_revision" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                review.verdict === "major_revision" ? "bg-orange-50 text-orange-700 border-orange-200" :
                                "bg-red-50 text-red-700 border-red-200"
                              }`}>
                                {getLocalizedReviewVerdict(review.verdict, locale)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              {(review as any).classification ? (
                                <Badge className={(review as any).classification === "positive" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
                                  {getClassificationCopy((review as any).classification, locale)}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
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
