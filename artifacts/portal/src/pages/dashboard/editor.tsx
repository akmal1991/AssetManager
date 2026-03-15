import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetSubmissions, useGetUsers, useAssignReviewer, useUpdateSubmissionStatus } from "@workspace/api-client-react";
import { Button, Card, Badge, PageTransition, Select, Textarea } from "@/components/ui/shared";
import { STATUS_LABELS, STATUS_COLORS, formatDate, LITERATURE_TYPES } from "@/lib/utils";
import { UserCheck, ShieldAlert, BookOpen, Send, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EditorDashboard() {
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
      refetch();
    } catch (e) {
      toast({ title: "Xatolik", description: "Yangilashda xatolik yuz berdi", variant: "destructive" });
    }
  };

  const newSubmissions = submissions.filter(s => s.status === 'submitted');
  const underReview = submissions.filter(s => s.status === 'under_review');

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-foreground">Muharrir Paneli</h2>
          <p className="text-muted-foreground mt-1">Yangi kelib tushgan ishlarni taqsimlash va qaror qabul qilish.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* New Submissions Queue */}
          <Card className="flex flex-col h-[700px]">
            <div className="p-6 border-b border-border/50 bg-blue-50/50 flex justify-between items-center">
              <h3 className="text-xl font-bold font-serif text-blue-900 flex items-center">
                <Send className="mr-2 h-5 w-5" /> Yangi tushgan ishlar
              </h3>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">{newSubmissions.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {newSubmissions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Yangi ishlar yo'q</div>
              ) : newSubmissions.map(sub => (
                <div key={sub.id} className="bg-background border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{LITERATURE_TYPES[sub.literatureType as keyof typeof LITERATURE_TYPES]}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(sub.createdAt)}</span>
                  </div>
                  <h4 className="text-lg font-bold mb-1">{sub.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">Muallif: {sub.authorName} • {sub.scientificDirection}</p>
                  
                  {selectedSubmission === sub.id ? (
                    <div className="bg-muted/30 p-4 rounded-lg mt-4 border border-border">
                      <label className="block text-sm font-medium mb-2">Ekspert tayinlash</label>
                      <Select value={reviewerId} onChange={e => setReviewerId(e.target.value)} className="mb-3 bg-white">
                        <option value="">Ekspertni tanlang</option>
                        {reviewers.map(r => (
                          <option key={r.id} value={r.id}>{r.fullName} ({r.scientificDegree || 'Ekspert'})</option>
                        ))}
                      </Select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAssign(sub.id)} disabled={!reviewerId || assignMutation.isPending} className="flex-1">Tasdiqlash</Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedSubmission(null)}>Bekor qilish</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedSubmission(sub.id)}>
                      <UserCheck className="mr-2 h-4 w-4" /> Ekspert tayinlash
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Under Review & Decision Queue */}
          <Card className="flex flex-col h-[700px]">
            <div className="p-6 border-b border-border/50 bg-amber-50/50 flex justify-between items-center">
              <h3 className="text-xl font-bold font-serif text-amber-900 flex items-center">
                <BookOpen className="mr-2 h-5 w-5" /> Ko'rib chiqilayotganlar
              </h3>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">{underReview.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {underReview.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Kutishdagi ishlar yo'q</div>
              ) : underReview.map(sub => (
                <div key={sub.id} className="bg-background border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-lg font-bold mb-1">{sub.title}</h4>
                  <div className="flex flex-wrap gap-2 my-3">
                    <Badge className={STATUS_COLORS[sub.status as keyof typeof STATUS_COLORS]}>
                      {STATUS_LABELS[sub.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </div>
                  
                  {selectedSubmission === sub.id + 10000 ? ( // Hacky way to reuse state variable for a different panel
                    <div className="bg-muted/30 p-4 rounded-lg mt-4 border border-border animate-in slide-in-from-top-2">
                      <label className="block text-sm font-medium mb-2">Qaror qabul qilish</label>
                      <Textarea 
                        placeholder="Muallif uchun izoh (ixtiyoriy)..." 
                        value={actionNotes}
                        onChange={e => setActionNotes(e.target.value)}
                        className="mb-3 bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <Button size="sm" variant="accent" onClick={() => handleStatusUpdate(sub.id, 'accepted')} className="bg-emerald-600 hover:bg-emerald-700 text-white">Qabul qilish</Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(sub.id, 'revision_required')} className="border-orange-500 text-orange-600 hover:bg-orange-50">Tuzatishga</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(sub.id, 'rejected')} className="col-span-2">Rad etish</Button>
                      </div>
                      <Button size="sm" variant="ghost" className="w-full" onClick={() => setSelectedSubmission(null)}>Bekor qilish</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedSubmission(sub.id + 10000)}>
                      <ShieldAlert className="mr-2 h-4 w-4" /> Qaror qabul qilish
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
