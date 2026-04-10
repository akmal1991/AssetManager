import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetSubmissions, useGetUsers, useAssignReviewer, useUpdateSubmissionStatus } from "@workspace/api-client-react";
import { Button, Card, Badge, PageTransition, Select, Textarea } from "@/components/ui/shared";
import { STATUS_COLORS, formatDate, getLocalizedLiteratureType, getLocalizedStatusLabel } from "@/lib/utils";
import { UserCheck, ShieldAlert, BookOpen, Send, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/i18n";

export default function EditorDashboard() {
  const [activeTab, setActiveTab] = useState("new");
  const { data: submissionsData, refetch } = useGetSubmissions({ limit: 100 });
  const { data: usersData } = useGetUsers();
  const assignMutation = useAssignReviewer();
  const statusMutation = useUpdateSubmissionStatus();
  const { toast } = useToast();
  const { locale, t } = useLocale();

  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);
  const [reviewerId, setReviewerId] = useState("");
  const [actionNotes, setActionNotes] = useState("");

  const submissions = submissionsData?.items || [];
  const reviewers = usersData?.filter((user) => user.role === "reviewer") || [];

  const handleAssign = async (id: number) => {
    if (!reviewerId) return;
    try {
      await assignMutation.mutateAsync({ id, data: { reviewerId: Number(reviewerId) } });
      await statusMutation.mutateAsync({ id, data: { status: "under_review" } });
      toast({
        title: t({ uz: "Bajarildi", en: "Done", ru: "Готово" }),
        description: t({ uz: "Ekspert tayinlandi", en: "Reviewer assigned", ru: "Рецензент назначен" }),
      });
      setSelectedSubmission(null);
      setReviewerId("");
      refetch();
    } catch {
      toast({
        title: t({ uz: "Xatolik", en: "Error", ru: "Ошибка" }),
        description: t({ uz: "Tayinlashda xatolik yuz berdi", en: "Failed to assign reviewer", ru: "Не удалось назначить рецензента" }),
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

  const newSubmissions = submissions.filter((submission) => submission.status === "submitted");
  const underReview = submissions.filter((submission) => submission.status === "under_review");
  const finished = submissions.filter((submission) => ["accepted", "rejected", "revision_required", "published"].includes(submission.status));

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary">
              {t({ uz: "Muharrir Paneli", en: "Editor Panel", ru: "Панель редактора" })}
            </h2>
            <p className="text-muted-foreground mt-1">
              {t({
                uz: "Kelib tushgan ishlarni taqsimlash va nashr qarorlarini qabul qilish.",
                en: "Distribute incoming works and manage editorial decisions.",
                ru: "Распределяйте поступившие работы и принимайте редакционные решения.",
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
              <p className="text-sm font-medium text-slate-500 mb-1">{t({ uz: "Taqrizda", en: "In review", ru: "На рецензии" })}</p>
              <h3 className="text-3xl font-bold text-slate-900">{underReview.length}</h3>
            </div>
            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </Card>
          <Card className="p-6 bg-white border-emerald-100 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{t({ uz: "Yakunlangan", en: "Completed", ru: "Завершено" })}</p>
              <h3 className="text-3xl font-bold text-slate-900">{finished.length}</h3>
            </div>
            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
          </Card>
        </div>

        <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto pb-2">
          <button onClick={() => setActiveTab("new")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === "new" ? "bg-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
            <Send className="h-4 w-4" />
            {t({ uz: "Arizalar navbati", en: "Submission queue", ru: "Очередь заявок" })} ({newSubmissions.length})
          </button>
          <button onClick={() => setActiveTab("review")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === "review" ? "bg-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
            <BookOpen className="h-4 w-4" />
            {t({ uz: "Taqriz jarayonida", en: "In review", ru: "В рецензировании" })} ({underReview.length})
          </button>
          <button onClick={() => setActiveTab("finished")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === "finished" ? "bg-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
            <CheckCircle className="h-4 w-4" />
            {t({ uz: "Nashr qarorlari", en: "Decisions", ru: "Решения" })} ({finished.length})
          </button>
        </div>

        <Card className="border border-border shadow-md overflow-hidden bg-white min-h-[500px]">
          {activeTab === "new" && (
            <div className="animate-in fade-in">
              <div className="px-6 py-4 border-b border-border bg-slate-50">
                <h3 className="font-bold font-serif text-slate-800">{t({ uz: "Ekspert tayinlash kutilmoqda", en: "Waiting for reviewer assignment", ru: "Ожидают назначения рецензента" })}</h3>
              </div>

              {newSubmissions.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-10 w-10 text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">
                    {t({ uz: "Barcha yangi arizalar ko'rib chiqilgan", en: "All new submissions have been processed", ru: "Все новые заявки уже обработаны" })}
                  </h4>
                  <p className="text-slate-500 mt-2">
                    {t({ uz: "Hozircha navbatda yangi kelib tushgan ilmiy ishlar yo'q.", en: "There are no newly submitted works in the queue.", ru: "В очереди пока нет новых научных работ." })}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {newSubmissions.map((submission) => (
                    <div key={submission.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {getLocalizedLiteratureType(submission.literatureType, locale)}
                            </span>
                            <span className="text-xs text-slate-400">{formatDate(submission.createdAt, locale)}</span>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 mb-1">{submission.title}</h4>
                          <p className="text-sm text-slate-600 mb-2">
                            <span className="font-medium text-slate-800">{submission.authorName}</span> • {submission.scientificDirection}
                          </p>
                        </div>

                        <div className="w-full md:w-auto md:min-w-[300px]">
                          {selectedSubmission === submission.id ? (
                            <div className="bg-slate-50 p-4 rounded-xl border border-blue-200 shadow-sm animate-in zoom-in-95 duration-200">
                              <label className="block text-sm font-semibold mb-2 text-slate-800">
                                {t({ uz: "Ekspertni tanlang", en: "Select a reviewer", ru: "Выберите рецензента" })}
                              </label>
                              <Select value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} className="mb-3 bg-white w-full border-slate-300">
                                <option value="">{t({ uz: "Taqrizchini tanlang...", en: "Choose a reviewer...", ru: "Выберите рецензента..." })}</option>
                                {reviewers.map((reviewer) => (
                                  <option key={reviewer.id} value={reviewer.id}>
                                    {reviewer.fullName} ({reviewer.scientificDegree || t({ uz: "Ekspert", en: "Reviewer", ru: "Рецензент" })})
                                  </option>
                                ))}
                              </Select>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleAssign(submission.id)} disabled={!reviewerId || assignMutation.isPending} className="flex-1">
                                  {t({ uz: "Tasdiqlash", en: "Confirm", ru: "Подтвердить" })}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedSubmission(null)} className="border border-slate-200 bg-white">
                                  {t({ uz: "Bekor qilish", en: "Cancel", ru: "Отмена" })}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button className="w-full shadow-sm" onClick={() => setSelectedSubmission(submission.id)}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              {t({ uz: "Ekspert tayinlash", en: "Assign reviewer", ru: "Назначить рецензента" })}
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
            <div className="animate-in fade-in">
              <div className="px-6 py-4 border-b border-border bg-slate-50">
                <h3 className="font-bold font-serif text-slate-800">{t({ uz: "Taqriz natijasi kutilmoqda yoki qaror qabul qilish", en: "Waiting for reviews or ready for decision", ru: "Ожидают рецензию или редакционное решение" })}</h3>
              </div>

              {underReview.length === 0 ? (
                <div className="p-16 text-center text-slate-500">
                  {t({ uz: "Taqriz jarayonida bo'lgan ishlar yo'q.", en: "There are no works currently under review.", ru: "Сейчас нет работ в процессе рецензирования." })}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {underReview.map((submission) => (
                    <div key={submission.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900 mb-2">{submission.title}</h4>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge className={STATUS_COLORS[submission.status as keyof typeof STATUS_COLORS]}>
                              {getLocalizedStatusLabel(submission.status, locale)}
                            </Badge>
                            <span className="text-sm text-slate-500 bg-slate-100 px-2 rounded-md">{submission.scientificDirection}</span>
                          </div>
                        </div>

                        <div className="w-full md:w-auto md:min-w-[350px]">
                          {selectedSubmission === submission.id ? (
                            <div className="bg-slate-50 p-5 rounded-xl border border-amber-200 shadow-sm animate-in zoom-in-95 duration-200">
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
          )}

          {activeTab === "finished" && (
            <div className="animate-in fade-in">
              <div className="px-6 py-4 border-b border-border bg-slate-50">
                <h3 className="font-bold font-serif text-slate-800">{t({ uz: "Qabul qilingan yoki rad etilgan arizalar", en: "Accepted or rejected submissions", ru: "Принятые или отклоненные заявки" })}</h3>
              </div>

              {finished.length === 0 ? (
                <div className="p-16 text-center text-slate-500">
                  {t({ uz: "Tarix bo'sh.", en: "History is empty.", ru: "История пуста." })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs tracking-wider border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-semibold w-1/2">{t({ uz: "Sarlavha", en: "Title", ru: "Название" })}</th>
                        <th className="px-6 py-4 font-semibold">{t({ uz: "Yo'nalish", en: "Direction", ru: "Направление" })}</th>
                        <th className="px-6 py-4 font-semibold">{t({ uz: "Holati", en: "Status", ru: "Статус" })}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {finished.map((submission) => (
                        <tr key={submission.id} className="hover:bg-slate-50 transition-colors bg-white">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">{submission.title}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {t({ uz: "Muallif", en: "Author", ru: "Автор" })}: {submission.authorName}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{submission.scientificDirection}</td>
                          <td className="px-6 py-4">
                            <Badge className={`px-3 py-1 rounded-full border ${STATUS_COLORS[submission.status as keyof typeof STATUS_COLORS]}`}>
                              {getLocalizedStatusLabel(submission.status, locale)}
                            </Badge>
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
