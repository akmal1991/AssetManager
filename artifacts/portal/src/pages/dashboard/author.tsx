import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetSubmissions } from "@workspace/api-client-react";
import { Button, Card, Badge, PageTransition } from "@/components/ui/shared";
import { PlusCircle, FileText, CheckCircle, Clock, AlertCircle, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { STATUS_COLORS, formatDate, getLocalizedLiteratureType, getLocalizedStatusLabel } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

export default function AuthorDashboard() {
  const { data, isLoading } = useGetSubmissions({ limit: 50 });
  const { locale, t, withLocale } = useLocale();

  const submissions = data?.items || [];

  const stats = {
    total: submissions.length,
    underReview: submissions.filter((submission) => ["submitted", "under_review"].includes(submission.status)).length,
    accepted: submissions.filter((submission) => ["accepted", "published"].includes(submission.status)).length,
    revision: submissions.filter((submission) => submission.status === "revision_required").length,
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary">
              {t({ uz: "Muallif Paneli", en: "Author Panel", ru: "Панель автора" })}
            </h2>
            <p className="text-muted-foreground mt-1">
              {t({
                uz: "Ilmiy ishlaringiz holatini kuzating va yangi ishlarni yuboring.",
                en: "Track the status of your scientific works and submit new ones.",
                ru: "Отслеживайте статус своих научных работ и отправляйте новые.",
              })}
            </p>
          </div>
          <Link href={withLocale("/submissions/new")}>
            <Button size="lg" className="shadow-lg shadow-primary/20 hover:-translate-y-0.5 bg-primary text-white">
              <PlusCircle className="mr-2 h-5 w-5" />
              {t({ uz: "Yangi ariza yuborish", en: "Submit new work", ru: "Отправить новую работу" })}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard title={t({ uz: "Jami yuborilgan", en: "Total submitted", ru: "Всего отправлено" })} value={stats.total} icon={<FileText />} color="blue" />
          <StatCard title={t({ uz: "Ko'rib chiqilmoqda", en: "Under review", ru: "На рассмотрении" })} value={stats.underReview} icon={<Clock />} color="amber" />
          <StatCard title={t({ uz: "Tuzatish kerak", en: "Revision required", ru: "Нужна доработка" })} value={stats.revision} icon={<AlertCircle />} color="orange" />
          <StatCard title={t({ uz: "Qabul qilingan", en: "Accepted", ru: "Принято" })} value={stats.accepted} icon={<CheckCircle />} color="emerald" />
        </div>

        <Card className="p-0 border border-border shadow-md overflow-hidden bg-white">
          <div className="px-6 py-5 border-b border-border bg-slate-50 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold font-serif text-slate-800">
              {t({ uz: "Mening qo'lyozmalarim", en: "My manuscripts", ru: "Мои рукописи" })}
            </h3>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              {t({ uz: "Yuklanmoqda...", en: "Loading...", ru: "Загрузка..." })}
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-slate-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">
                {t({
                  uz: "Hali hech qanday ariza yuborilmagan",
                  en: "No submissions yet",
                  ru: "Пока нет отправленных заявок",
                })}
              </h4>
              <p className="text-slate-500 max-w-md mb-6">
                {t({
                  uz: "Yangi darslik, monografiya yoki qo'llanma yuborish uchun yuqoridagi tugmadan foydalaning.",
                  en: "Use the button above to submit a new textbook, monograph, or teaching guide.",
                  ru: "Используйте кнопку выше, чтобы отправить новый учебник, монографию или пособие.",
                })}
              </p>
              <Link href={withLocale("/submissions/new")}>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
                  {t({ uz: "Yangi ariza", en: "New submission", ru: "Новая заявка" })}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs tracking-wider border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-1/3">{t({ uz: "Sarlavha", en: "Title", ru: "Название" })}</th>
                    <th className="px-6 py-4 font-semibold">{t({ uz: "Turi", en: "Type", ru: "Тип" })}</th>
                    <th className="px-6 py-4 font-semibold">{t({ uz: "Holati", en: "Status", ru: "Статус" })}</th>
                    <th className="px-6 py-4 font-semibold">{t({ uz: "Yuborilgan sana", en: "Submitted on", ru: "Дата отправки" })}</th>
                    <th className="px-6 py-4 font-semibold text-right">{t({ uz: "Amallar", en: "Actions", ru: "Действия" })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.map((submission, index) => (
                    <tr key={submission.id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 line-clamp-2">{submission.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{submission.scientificDirection}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                          {getLocalizedLiteratureType(submission.literatureType, locale)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`rounded-full px-3 py-0.5 border ${STATUS_COLORS[submission.status as keyof typeof STATUS_COLORS]}`}>
                          {getLocalizedStatusLabel(submission.status, locale)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(submission.createdAt, locale)}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 group">
                          {t({ uz: "Batafsil", en: "Details", ru: "Подробнее" })}
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageTransition>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const iconColors = {
    blue: "text-blue-600 bg-blue-100",
    amber: "text-amber-600 bg-amber-100",
    orange: "text-orange-600 bg-orange-100",
    emerald: "text-emerald-600 bg-emerald-100",
  };

  return (
    <Card className="p-6 border border-border shadow-sm hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${iconColors[color as keyof typeof iconColors]}`}>
          {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 font-sans mb-1">{value}</p>
        <p className="text-sm font-medium text-slate-500">{title}</p>
      </div>
    </Card>
  );
}
