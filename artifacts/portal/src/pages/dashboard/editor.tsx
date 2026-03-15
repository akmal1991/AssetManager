import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetSubmissions, useGetUsers, useAssignReviewer, useUpdateSubmissionStatus } from "@workspace/api-client-react";
import { Button, Card, Badge, PageTransition, Select, Textarea } from "@/components/ui/shared";
import { STATUS_LABELS, STATUS_COLORS, formatDate, LITERATURE_TYPES } from "@/lib/utils";
import { UserCheck, ShieldAlert, BookOpen, Send, FileText, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EditorDashboard() {
  const [activeTab, setActiveTab] = useState("new");
  const { data: submissionsData, refetch } = useGetSubmissions({ limit: 100 });
  const { data: usersData } = useGetUsers();
  const assignMutation = useAssignReviewer();
  const statusMutation = useUpdateSubmissionStatus();
  const { toast } = useToast();

  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);
  const [reviewerId, setReviewerId] = useState<string>("");
  const [actionNotes, setActionNotes] = useState("");

  const submissions = submissionsData?.items || [];
  const reviewers = usersData?.filter(u => u.role === 'reviewer') || [];

  const handleAssign = async (id: number) => {
    if (!reviewerId) return;
    try {
      await assignMutation.mutateAsync({ id, data: { reviewerId: Number(reviewerId) } });
      await statusMutation.mutateAsync({ id, data: { status: 'under_review' } });
      toast({ title: "Bajarildi", description: "Ekspert tayinlandi" });
      setSelectedSubmission(null);
      refetch();
    } catch (e) {
      toast({ title: "Xatolik", description: "Tayinlashda xatolik yuz berdi", variant: "destructive" });
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: any) => {
    try {
      await statusMutation.mutateAsync({ id, data: { status: newStatus, notes: actionNotes } });
      toast({ title: "Bajarildi", description: "Holat yangilandi" });
      setSelectedSubmission(null);
      setActionNotes("");
      refetch();
    } catch (e) {
      toast({ title: "Xatolik", description: "Yangilashda xatolik yuz berdi", variant: "destructive" });
    }
  };

  const newSubmissions = submissions.filter(s => s.status === 'submitted');
  const underReview = submissions.filter(s => s.status === 'under_review');
  const finished = submissions.filter(s => ['accepted', 'rejected', 'revision_required', 'published'].includes(s.status));

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary">Muharrir Paneli</h2>
            <p className="text-muted-foreground mt-1">Kelib tushgan ishlarni taqsimlash va nashr qarorlarini qabul qilish.</p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border-blue-100 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Yangi arizalar</p>
              <h3 className="text-3xl font-bold text-slate-900">{newSubmissions.length}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
          </Card>
          <Card className="p-6 bg-white border-amber-100 shadow-sm flex items-center justify-between border-l-4 border-l-amber-500">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Taqrizda</p>
              <h3 className="text-3xl font-bold text-slate-900">{underReview.length}</h3>
            </div>
            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </Card>
          <Card className="p-6 bg-white border-emerald-100 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Yakunlangan</p>
              <h3 className="text-3xl font-bold text-slate-900">{finished.length}</h3>
            </div>
            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'new' 
              ? "bg-primary text-white shadow-md" 
              : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Send className="h-4 w-4" />
            Arizalar navbati ({newSubmissions.length})
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'review' 
              ? "bg-primary text-white shadow-md" 
              : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Taqriz jarayonida ({underReview.length})
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'finished' 
              ? "bg-primary text-white shadow-md" 
              : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            Nashr qarorlari ({finished.length})
          </button>
        </div>

        {/* Content Area */}
        <Card className="border border-border shadow-md overflow-hidden bg-white min-h-[500px]">
          {activeTab === 'new' && (
            <div className="animate-in fade-in">
              <div className="px-6 py-4 border-b border-border bg-slate-50">
                <h3 className="font-bold font-serif text-slate-800">Ekspert tayinlash kutilmoqda</h3>
              </div>
              
              {newSubmissions.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-10 w-10 text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Barcha yangi arizalar ko'rib chiqilgan</h4>
                  <p className="text-slate-500 mt-2">Hozircha navbatda yangi kelib tushgan ilmiy ishlar yo'q.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {newSubmissions.map(sub => (
                    <div key={sub.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {LITERATURE_TYPES[sub.literatureType as keyof typeof LITERATURE_TYPES]}
                            </span>
                            <span className="text-xs text-slate-400">{formatDate(sub.createdAt)}</span>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 mb-1">{sub.title}</h4>
                          <p className="text-sm text-slate-600 mb-2">
                            <span className="font-medium text-slate-800">{sub.authorName}</span> • {sub.scientificDirection}
                          </p>
                        </div>
                        
                        <div className="w-full md:w-auto md:min-w-[300px]">
                          {selectedSubmission === sub.id ? (
                            <div className="bg-slate-50 p-4 rounded-xl border border-blue-200 shadow-sm animate-in zoom-in-95 duration-200">
                              <label className="block text-sm font-semibold mb-2 text-slate-800">Ekspertni tanlang</label>
                              <Select value={reviewerId} onChange={e => setReviewerId(e.target.value)} className="mb-3 bg-white w-full border-slate-300">
                                <option value="">Taqrizchini tanlang...</option>
                                {reviewers.map(r => (
                                  <option key={r.id} value={r.id}>{r.fullName} ({r.scientificDegree || 'Ekspert'})</option>
                                ))}
                              </Select>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleAssign(sub.id)} disabled={!reviewerId || assignMutation.isPending} className="flex-1">
                                  Tasdiqlash
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedSubmission(null)} className="border border-slate-200 bg-white">
                                  Bekor qilish
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button className="w-full shadow-sm" onClick={() => setSelectedSubmission(sub.id)}>
                              <UserCheck className="mr-2 h-4 w-4" /> Ekspert tayinlash
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

          {activeTab === 'review' && (
            <div className="animate-in fade-in">
              <div className="px-6 py-4 border-b border-border bg-slate-50">
                <h3 className="font-bold font-serif text-slate-800">Taqriz natijasi kutilmoqda yoki qaror qabul qilish</h3>
              </div>
              
              {underReview.length === 0 ? (
                <div className="p-16 text-center text-slate-500">Taqriz jarayonida bo'lgan ishlar yo'q.</div>
              ) : (
                <div className="divide-y divide-border">
                  {underReview.map(sub => (
                    <div key={sub.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900 mb-2">{sub.title}</h4>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge className={STATUS_COLORS[sub.status as keyof typeof STATUS_COLORS]}>
                              {STATUS_LABELS[sub.status as keyof typeof STATUS_LABELS]}
                            </Badge>
                            <span className="text-sm text-slate-500 bg-slate-100 px-2 rounded-md">
                              {sub.scientificDirection}
                            </span>
                          </div>
                        </div>
                        
                        <div className="w-full md:w-auto md:min-w-[350px]">
                          {selectedSubmission === sub.id ? (
                            <div className="bg-slate-50 p-5 rounded-xl border border-amber-200 shadow-sm animate-in zoom-in-95 duration-200">
                              <label className="block text-sm font-semibold mb-2 text-slate-800">Qaror qabul qilish</label>
                              <Textarea 
                                placeholder="Muallif uchun izoh (ixtiyoriy)..." 
                                value={actionNotes}
                                onChange={e => setActionNotes(e.target.value)}
                                className="mb-4 bg-white text-sm min-h-[80px]"
                              />
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <Button size="sm" onClick={() => handleStatusUpdate(sub.id, 'accepted')} className="bg-emerald-600 hover:bg-emerald-700 text-white">Qabul</Button>
                                <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(sub.id, 'revision_required')} className="border-orange-300 text-orange-700 hover:bg-orange-50 bg-white">Tuzatish</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(sub.id, 'rejected')} className="col-span-2">Rad etish</Button>
                              </div>
                              <Button size="sm" variant="ghost" className="w-full mt-1" onClick={() => setSelectedSubmission(null)}>Bekor qilish</Button>
                            </div>
                          ) : (
                            <Button variant="outline" className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 bg-amber-50/30" onClick={() => setSelectedSubmission(sub.id)}>
                              <ShieldAlert className="mr-2 h-4 w-4" /> Qaror qabul qilish
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

          {activeTab === 'finished' && (
            <div className="animate-in fade-in">
              <div className="px-6 py-4 border-b border-border bg-slate-50">
                <h3 className="font-bold font-serif text-slate-800">Qabul qilingan yoki rad etilgan arizalar</h3>
              </div>
              
              {finished.length === 0 ? (
                <div className="p-16 text-center text-slate-500">Tarix bo'sh.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs tracking-wider border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-semibold w-1/2">Sarlavha</th>
                        <th className="px-6 py-4 font-semibold">Yo'nalish</th>
                        <th className="px-6 py-4 font-semibold">Holati</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {finished.map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-50 transition-colors bg-white">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">{sub.title}</p>
                            <p className="text-xs text-slate-500 mt-1">Muallif: {sub.authorName}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {sub.scientificDirection}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`px-3 py-1 rounded-full border ${STATUS_COLORS[sub.status as keyof typeof STATUS_COLORS]}`}>
                              {STATUS_LABELS[sub.status as keyof typeof STATUS_LABELS]}
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
