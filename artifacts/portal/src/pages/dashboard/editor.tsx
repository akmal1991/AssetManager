import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { UserCheck, ShieldAlert, BookOpen, Send, CheckCircle, Clock, Users, ThumbsUp, ThumbsDown } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetSubmissions, useAssignReviewer, useUpdateSubmissionStatus, useGetReviews } from "@workspace/api-client-react";
import { Button, Card, Badge, PageTransition, Select, Textarea } from "@/components/ui/shared";
import { STATUS_COLORS, formatDate, getLocalizedLiteratureType, getLocalizedStatusLabel, getLocalizedReviewVerdict } from "@/lib/utils";
import { EXPERTS_QUERY_KEY, fetchExperts } from "@/lib/experts";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/i18n";

function getEditorTab(path: string) {
  const match = path.match(/^\/dashboard\/(?:editor|publisher)\/?([^/]*)$/);
  return match?.[1] || "new";
}

function getClassificationCopy(classification: string | null | undefined, locale: "uz" | "en" | "ru") {
  const labels = {
    positive: { uz: "Ijobiy xulosa", en: "Positive conclusion", ru: "Положительное заключение" },
    negative: { uz: "Salbiy xulosa", en: "Negative conclusion", ru: "Отрицательное заключение" },
  } as const;
  if (!classification) return "";
  return labels[classification as keyof typeof labels]?.[locale] ?? classification;
}

export default function EditorDashboard() {
  const [location, setLocation] = useLocation();
  const { locale, t, withLocale, stripLocale } = useLocale();
  const currentPath = stripLocale(location);
  const activeTab = getEditorTab(currentPath);
  const basePath = currentPath.startsWith("/dashboard/publisher") ? "/dashboard/publisher" : "/dashboard/editor";
  const { data: submissionsData, refetch } = useGetSubmissions({ limit: 100 });
  const { data: reviews = [], refetch: refetchReviews } = useGetReviews();
  const { data: experts = [], isLoading: expertsLoading, isFetching: expertsFetching, isError: expertsError, refetch: refetchExperts } = useQuery({
    queryKey: EXPERTS_QUERY_KEY,
    queryFn: fetchExperts,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const assignMutation = useAssignReviewer();
  const statusMutation = useUpdateSubmissionStatus();
  const { toast } = useToast();

  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);
  const [expertSelectionBySubmission, setExpertSelectionBySubmission] = useState<Record<number, string>>({});
  const [actionNotes, setActionNotes] = useState("");

  const submissions = submissionsData?.items || [];
  const assignableExperts = experts;
  const expertsRefreshing = expertsLoading || expertsFetching;
  const newSubmissions = submissions.filter((submission) => submission.status === "submitted");
  const underReview = submissions.filter((submission) => submission.status === "under_review");
  const finished = submissions.filter((submission) => ["accepted", "rejected", "revision_required", "published"].includes(submission.status));
  const positiveReviews = useMemo(() => reviews.filter((review: any) => review.classification === "positive"), [reviews]);
  const negativeReviews = useMemo(() => reviews.filter((review: any) => review.classification === "negative"), [reviews]);

  const switchTab = (tab: string) => setLocation(withLocale(tab === "new" ? basePath : `${basePath}/${tab}`));
  const getSelectedExpertId = (submissionId: number) => expertSelectionBySubmission[submissionId] ?? "";
  const setSelectedExpertId = (submissionId: number, value: string) => {
    setExpertSelectionBySubmission((current) => ({ ...current, [submissionId]: value }));
  };

  const handleAssign = async (id: number) => {
    const expertId = getSelectedExpertId(id);
    const numericExpertId = Number(expertId);
    if (!Number.isInteger(numericExpertId) || numericExpertId <= 0) {
      toast({
        title: t({ uz: "Ekspert tanlanmagan", en: "No expert selected", ru: "Эксперт не выбран" }),
        description: t({
          uz: "Davom etish uchun faol ekspertni tanlang.",
          en: "Select an active expert before continuing.",
          ru: "Выберите активного эксперта, чтобы продолжить.",
        }),
        variant: "destructive",
      });
      return;
    }
    try {
      await assignMutation.mutateAsync({ id, data: { reviewerId: numericExpertId, expertId: numericExpertId } as any });
      toast({
        title: t({ uz: "Bajarildi", en: "Done", ru: "Готово" }),
        description: t({ uz: "Ekspert tayinlandi", en: "Expert assigned", ru: "Эксперт назначен" }),
      });
      setSelectedSubmission(null);
      setExpertSelectionBySubmission((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      await Promise.all([refetch(), refetchReviews(), refetchExperts()]);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message;
      toast({
        title: t({ uz: "Xatolik", en: "Error", ru: "Ошибка" }),
        description: message || t({ uz: "Tayinlashda xatolik yuz berdi", en: "Failed to assign expert", ru: "Не удалось назначить эксперта" }),
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: any) => {
    try {
      await statusMutation.mutateAsync({ id, data: { status: newStatus, notes: actionNotes } });
      toast({
        title: t({ uz: "Bajarildi", en: "Done", ru: "Готово" }),
        description: t({ uz: "Holat yangilandi", en: "Status updated", ru: "Статус обновлен" }),
      });
      setSelectedSubmission(null);
      setActionNotes("");
      refetch();
    } catch {
      toast({
        title: t({ uz: "Xatolik", en: "Error", ru: "Ошибка" }),
        description: t({ uz: "Yangilashda xatolik yuz berdi", en: "Failed to update status", ru: "Не удалось обновить статус" }),
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary">
              {t({ uz: "Ekspert Paneli", en: "Expert Panel", ru: "Панель эксперта" })}
            </h2>
            <p className="text-muted-foreground mt-1">
              {t({
                uz: "Kelib tushgan ishlarni taqsimlash va ekspert xulosalarini boshqarish.",
                en: "Distribute incoming works and manage expert conclusions.",
                ru: "Распределяйте поступившие работы и управляйте экспертными заключениями.",
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border-blue-100 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{t({ uz: "Yangi arizalar", en: "New submissions", ru: "Новые заявки" })}</p>
              <h3 className="text-3xl font-bold text-slate-900">{newSubmissions.length}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
          </Card>
          <Card className="p-6 bg-white border-amber-100 shadow-sm flex items-center justify-between border-l-4 border-l-amber-500">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{t({ uz: "Ijobiy xulosalar", en: "Positive expert conclusions", ru: "Положительные экспертные заключения" })}</p>
              <h3 className="text-3xl font-bold text-slate-900">{positiveReviews.length}</h3>
            </div>
            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <ThumbsUp className="h-6 w-6 text-emerald-600" />
            </div>
          </Card>
          <Card className="p-6 bg-white border-red-100 shadow-sm flex items-center justify-between border-l-4 border-l-red-500">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{t({ uz: "Salbiy xulosalar", en: "Negative expert conclusions", ru: "Отрицательные экспертные заключения" })}</p>
              <h3 className="text-3xl font-bold text-slate-900">{negativeReviews.length}</h3>
            </div>
            <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center">
              <ThumbsDown className="h-6 w-6 text-red-600" />
            </div>
          </Card>
        </div>

        <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto pb-2">
          {[
            { key: "new", label: t({ uz: "Arizalar navbati", en: "Submission queue", ru: "Очередь заявок" }), icon: Send, count: newSubmissions.length },
            { key: "review", label: t({ uz: "Ekspertiza jarayonida", en: "Expert review in progress", ru: "Экспертиза в процессе" }), icon: BookOpen, count: underReview.length },
            { key: "positive", label: t({ uz: "Ijobiy xulosalar", en: "Positive expert conclusions", ru: "Положительные экспертные заключения" }), icon: ThumbsUp, count: positiveReviews.length },
            { key: "negative", label: t({ uz: "Salbiy xulosalar", en: "Negative expert conclusions", ru: "Отрицательные экспертные заключения" }), icon: ThumbsDown, count: negativeReviews.length },
            { key: "experts", label: t({ uz: "Ekspertlar", en: "Experts", ru: "Эксперты" }), icon: Users, count: experts.length },
            { key: "decisions", label: t({ uz: "Nashr qarorlari", en: "Decisions", ru: "Решения" }), icon: CheckCircle, count: finished.length },
          ].map((tab) => (
            <button key={tab.key} onClick={() => switchTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
              <tab.icon className="h-4 w-4" />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <Card className="border border-border shadow-md overflow-hidden bg-white min-h-[500px]">
          {activeTab === "new" && (
            <div className="animate-in fade-in">
              <div className="px-6 py-4 border-b border-border bg-slate-50">
                <h3 className="font-bold font-serif text-slate-800">{t({ uz: "Ekspert tayinlash kutilmoqda", en: "Waiting for expert assignment", ru: "Ожидают назначения эксперта" })}</h3>
              </div>
              {newSubmissions.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-10 w-10 text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">{t({ uz: "Barcha yangi arizalar ko'rib chiqilgan", en: "All new submissions have been processed", ru: "Все новые заявки уже обработаны" })}</h4>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {newSubmissions.map((submission) => (
                    <div key={submission.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded">{getLocalizedLiteratureType(submission.literatureType, locale)}</span>
                            <span className="text-xs text-slate-400">{formatDate(submission.createdAt, locale)}</span>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 mb-1">{submission.title}</h4>
                          <p className="text-sm text-slate-600 mb-2">
                            <span className="font-medium text-slate-800">{submission.authorName}</span> • {submission.scientificDirection}
                          </p>
                        </div>

                        <div className="w-full md:w-auto md:min-w-[320px]">
                          {selectedSubmission === submission.id ? (
                            <div className="bg-slate-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                              <label className="block text-sm font-semibold mb-2 text-slate-800">
                                {t({ uz: "Ekspertni tanlang", en: "Select an expert", ru: "Выберите эксперта" })}
                              </label>
                              <Select
                                value={getSelectedExpertId(submission.id)}
                                onChange={(event) => setSelectedExpertId(submission.id, event.target.value)}
                                className="mb-3 bg-white w-full border-slate-300"
                                disabled={expertsRefreshing || assignMutation.isPending}
                              >
                                <option value="">{t({ uz: "Ekspertni tanlang...", en: "Choose an expert...", ru: "Выберите эксперта..." })}</option>
                                {expertsRefreshing ? (
                                  <option value="" disabled>{t({ uz: "Ekspertlar yangilanmoqda...", en: "Refreshing experts...", ru: "Обновление экспертов..." })}</option>
                                ) : assignableExperts.map((expert) => (
                                  <option key={expert.id} value={expert.id}>
                                    {expert.fullName} ({(expert.expertSpecialties || []).join(", ") || expert.scientificDegree || "Expert"})
                                  </option>
                                ))}
                              </Select>
                              {expertsError && (
                                <p className="text-xs text-red-600 mb-3">
                                  {t({ uz: "Ekspertlar ro'yxatini yuklab bo'lmadi.", en: "Could not load the experts list.", ru: "Не удалось загрузить список экспертов." })}
                                </p>
                              )}
                              {!expertsRefreshing && !expertsError && assignableExperts.length === 0 && (
                                <p className="text-xs text-amber-700 mb-3">
                                  {t({ uz: "Faol ekspert topilmadi. Avval Admin panelida ekspert qo'shing yoki faollashtiring.", en: "No active experts found. Add or activate an expert in the Admin panel first.", ru: "Активные эксперты не найдены. Сначала добавьте или активируйте эксперта в панели администратора." })}
                                </p>
                              )}
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleAssign(submission.id)} disabled={!getSelectedExpertId(submission.id) || expertsRefreshing || assignMutation.isPending} className="flex-1">
                                  {assignMutation.isPending
                                    ? t({ uz: "Tayinlanmoqda...", en: "Assigning...", ru: "Назначение..." })
                                    : t({ uz: "Tasdiqlash", en: "Confirm", ru: "Подтвердить" })}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedSubmission(null)} className="border border-slate-200 bg-white">
                                  {t({ uz: "Bekor qilish", en: "Cancel", ru: "Отмена" })}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button className="w-full shadow-sm" onClick={() => {
                              setSelectedSubmission(submission.id);
                              setSelectedExpertId(submission.id, "");
                              refetchExperts();
                            }}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              {t({ uz: "Ekspert tayinlash", en: "Assign expert", ru: "Назначить эксперта" })}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "review" && (
            <SubmissionDecisionPanel
              title={t({ uz: "Ekspert xulosasi kutilmoqda yoki qaror qabul qilish", en: "Waiting for expert conclusion or ready for decision", ru: "Ожидается экспертное заключение или решение" })}
              items={underReview}
              locale={locale}
              t={t}
              selectedSubmission={selectedSubmission}
              setSelectedSubmission={setSelectedSubmission}
              actionNotes={actionNotes}
              setActionNotes={setActionNotes}
              handleStatusUpdate={handleStatusUpdate}
            />
          )}

          {activeTab === "positive" && (
            <ReviewsPanel reviews={positiveReviews} title={t({ uz: "Ijobiy ekspert xulosalari", en: "Positive expert conclusions", ru: "Положительные экспертные заключения" })} locale={locale} t={t} />
          )}

          {activeTab === "negative" && (
            <ReviewsPanel reviews={negativeReviews} title={t({ uz: "Salbiy ekspert xulosalari", en: "Negative expert conclusions", ru: "Отрицательные экспертные заключения" })} locale={locale} t={t} />
          )}

          {activeTab === "experts" && (
            <div className="animate-in fade-in">
              <div className="px-6 py-4 border-b border-border bg-slate-50">
                <h3 className="font-bold font-serif text-slate-800">{t({ uz: "Ekspertlar ro'yxati", en: "Experts list", ru: "Список экспертов" })}</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
                {experts.map((expert) => (
                  <Card key={expert.id} className="p-5 bg-slate-50/60 border border-slate-200 shadow-none">
                    <div className="flex items-start justify-between gap-3 mb-2">
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
                      {(expert.expertSpecialties || []).map((item) => (
                        <Badge key={item} className="bg-white text-slate-700 border border-slate-200">{item}</Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "decisions" && (
            <div className="animate-in fade-in">
              <div className="px-6 py-4 border-b border-border bg-slate-50">
                <h3 className="font-bold font-serif text-slate-800">{t({ uz: "Qabul qilingan yoki rad etilgan arizalar", en: "Accepted or rejected submissions", ru: "Принятые или отклоненные заявки" })}</h3>
              </div>
              {finished.length === 0 ? (
                <div className="p-16 text-center text-slate-500">{t({ uz: "Tarix bo'sh.", en: "History is empty.", ru: "История пуста." })}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs tracking-wider border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-semibold w-1/2">{t({ uz: "Sarlavha", en: "Title", ru: "Название" })}</th>
                        <th className="px-6 py-4 font-semibold">{t({ uz: "Yo'nalish", en: "Direction", ru: "Направление" })}</th>
                        <th className="px-6 py-4 font-semibold">{t({ uz: "Holati", en: "Status", ru: "Статус" })}</th>
                        <th className="px-6 py-4 font-semibold text-right">{t({ uz: "Amal", en: "Action", ru: "Действие" })}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {finished.map((submission) => (
                        <tr key={submission.id} className="hover:bg-slate-50 transition-colors bg-white">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">{submission.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{t({ uz: "Muallif", en: "Author", ru: "Автор" })}: {submission.authorName}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{submission.scientificDirection}</td>
                          <td className="px-6 py-4">
                            <Badge className={`px-3 py-1 rounded-full border ${STATUS_COLORS[submission.status as keyof typeof STATUS_COLORS]}`}>
                              {getLocalizedStatusLabel(submission.status, locale)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {submission.status === "accepted" ? (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleStatusUpdate(submission.id, "published")}
                                disabled={statusMutation.isPending}
                              >
                                {t({ uz: "Nashr qilish", en: "Publish", ru: "Опубликовать" })}
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                {t({ uz: "Amal yo'q", en: "No action", ru: "Нет действия" })}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      </PageTransition>
    </DashboardLayout>
  );
}

function SubmissionDecisionPanel({ title, items, locale, t, selectedSubmission, setSelectedSubmission, actionNotes, setActionNotes, handleStatusUpdate }: any) {
  return (
    <div className="animate-in fade-in">
      <div className="px-6 py-4 border-b border-border bg-slate-50">
        <h3 className="font-bold font-serif text-slate-800">{title}</h3>
      </div>

      {items.length === 0 ? (
        <div className="p-16 text-center text-slate-500">{t({ uz: "Hozircha ishlar yo'q.", en: "No items at the moment.", ru: "Сейчас нет записей." })}</div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((submission: any) => (
            <div key={submission.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-900 mb-2">{submission.title}</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className={STATUS_COLORS[submission.status as keyof typeof STATUS_COLORS]}>
                      {getLocalizedStatusLabel(submission.status, locale)}
                    </Badge>
                    <span className="text-sm text-slate-500 bg-slate-100 px-2 rounded-md">{submission.scientificDirection}</span>
                    {(submission as any).reviewSummary?.latestClassification && (
                      <Badge className={(submission as any).reviewSummary.latestClassification === "positive" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
                        {getClassificationCopy((submission as any).reviewSummary.latestClassification, locale)}
                      </Badge>
                    )}
                  </div>
                  {((submission as any).reviewSummary?.assignedExpertNames ?? []).length > 0 && (
                    <p className="text-xs text-slate-500">
                      {t({ uz: "Tayinlangan ekspert", en: "Assigned expert", ru: "Назначенный эксперт" })}:{" "}
                      <span className="font-semibold text-slate-700">
                        {((submission as any).reviewSummary.assignedExpertNames as string[]).join(", ")}
                      </span>
                    </p>
                  )}
                </div>

                <div className="w-full md:w-auto md:min-w-[350px]">
                  {selectedSubmission === submission.id ? (
                    <div className="bg-slate-50 p-5 rounded-xl border border-amber-200 shadow-sm">
                      <label className="block text-sm font-semibold mb-2 text-slate-800">
                        {t({ uz: "Qaror qabul qilish", en: "Make a decision", ru: "Принять решение" })}
                      </label>
                      <Textarea placeholder={t({ uz: "Muallif uchun izoh (ixtiyoriy)...", en: "Comment for the author (optional)...", ru: "Комментарий для автора (необязательно)..." })} value={actionNotes} onChange={(event) => setActionNotes(event.target.value)} className="mb-4 bg-white text-sm min-h-[80px]" />
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <Button size="sm" onClick={() => handleStatusUpdate(submission.id, "accepted")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          {t({ uz: "Qabul", en: "Accept", ru: "Принять" })}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(submission.id, "revision_required")} className="border-orange-300 text-orange-700 hover:bg-orange-50 bg-white">
                          {t({ uz: "Tuzatish", en: "Request revision", ru: "На доработку" })}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(submission.id, "rejected")} className="col-span-2">
                          {t({ uz: "Rad etish", en: "Reject", ru: "Отклонить" })}
                        </Button>
                      </div>
                      <Button size="sm" variant="ghost" className="w-full mt-1" onClick={() => setSelectedSubmission(null)}>
                        {t({ uz: "Bekor qilish", en: "Cancel", ru: "Отмена" })}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 bg-amber-50/30" onClick={() => setSelectedSubmission(submission.id)}>
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      {t({ uz: "Qaror qabul qilish", en: "Make a decision", ru: "Принять решение" })}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewsPanel({ reviews, title, locale, t }: any) {
  return (
    <div className="animate-in fade-in">
      <div className="px-6 py-4 border-b border-border bg-slate-50">
        <h3 className="font-bold font-serif text-slate-800">{title}</h3>
      </div>
      {reviews.length === 0 ? (
        <div className="p-16 text-center text-slate-500">
          {t({ uz: "Bu bo'limda hozircha xulosalar yo'q.", en: "No expert conclusions in this section yet.", ru: "В этом разделе пока нет экспертных заключений." })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">{t({ uz: "Sarlavha", en: "Title", ru: "Название" })}</th>
                <th className="px-6 py-4 font-semibold">{t({ uz: "Ekspert", en: "Expert", ru: "Эксперт" })}</th>
                <th className="px-6 py-4 font-semibold">{t({ uz: "Xulosa", en: "Verdict", ru: "Вердикт" })}</th>
                <th className="px-6 py-4 font-semibold">{t({ uz: "Yuborilgan", en: "Submitted", ru: "Отправлено" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reviews.map((review: any) => (
                <tr key={review.id} className="hover:bg-slate-50 transition-colors bg-white">
                  <td className="px-6 py-4 font-medium text-slate-900">{review.submissionTitle}</td>
                  <td className="px-6 py-4 text-slate-600">{review.reviewerName}</td>
                  <td className="px-6 py-4">
                    <Badge className={review.classification === "positive" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
                      {getLocalizedReviewVerdict(review.verdict, locale)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(review.submittedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
