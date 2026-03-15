import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetReview, useSubmitReview } from "@workspace/api-client-react";
import { Button, Card, Textarea, PageTransition, LoadingSpinner } from "@/components/ui/shared";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, CheckCircle, Edit3, AlertTriangle, XCircle, FileText, User } from "lucide-react";
import { Link } from "wouter";
import { LITERATURE_TYPES, STATUS_LABELS } from "@/lib/utils";

export default function ReviewForm() {
  const [, params] = useRoute("/reviews/:id");
  const reviewId = Number(params?.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  // Pre-fill if already submitted
  React.useEffect(() => {
    if (review?.status === 'submitted') {
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
      toast({ title: "Diqqat", description: "Yakuniy xulosani tanlang", variant: "destructive" });
      return;
    }
    try {
      await submitMutation.mutateAsync({
        id: reviewId,
        data: {
          ...scores,
          ...comments,
          verdict
        }
      });
      toast({ title: "Muvaffaqiyatli", description: "Taqriz yuborildi" });
      setLocation("/dashboard/reviewer");
    } catch (err) {
      toast({ title: "Xatolik", description: "Saqlashda xatolik", variant: "destructive" });
    }
  };

  const handleScoreChange = (key: string, value: number) => {
    if (value >= 1 && value <= 10) {
      setScores({ ...scores, [key]: value });
    }
  };

  if (isLoading || !review) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const isReadOnly = review.status === 'submitted';

  const verdictOptions = [
    { id: 'accept', label: 'Qabul qilish', color: 'emerald', icon: CheckCircle },
    { id: 'minor_revision', label: 'Kichik tuzatishlar', color: 'blue', icon: Edit3 },
    { id: 'major_revision', label: 'Katta tuzatishlar', color: 'orange', icon: AlertTriangle },
    { id: 'reject', label: 'Rad etish', color: 'red', icon: XCircle },
  ];

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="max-w-4xl mx-auto py-6">
          <Link href="/dashboard/reviewer" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary mb-6 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Ortga qaytish
          </Link>

          <div className="mb-6">
            <h2 className="text-3xl font-serif font-bold text-primary">Ekspert Taqrizi</h2>
          </div>

          <Card className="p-6 mb-8 border border-border shadow-md bg-white">
            <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-slate-800">
              <FileText className="h-5 w-5 text-primary" />
              Asar ma'lumotlari
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Asar nomi</p>
                <p className="font-semibold text-slate-900">{review.submissionTitle}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Adabiyot turi</p>
                <p className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded inline-block">
                  {LITERATURE_TYPES[review.submission?.literatureType as keyof typeof LITERATURE_TYPES] || review.submission?.literatureType || 'Noma\'lum'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Ilmiy yo'nalish</p>
                <p className="font-medium text-slate-900">{review.submission?.scientificDirection || 'Noma\'lum'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1 flex items-center gap-1"><User className="h-4 w-4"/> Muallif</p>
                <p className="font-medium text-slate-900">{review.submission?.authorName || 'Noma\'lum'}</p>
              </div>
            </div>
          </Card>

          <form onSubmit={handleSubmit}>
            <Card className="p-8 mb-6 shadow-sm border border-border bg-white">
              <h3 className="text-lg font-bold font-serif mb-6 border-b border-slate-100 pb-2 text-slate-800">1. Baholash (1-10)</h3>
              <div className="space-y-8">
                {Object.entries({
                  scientificSignificance: "Ilmiy ahamiyati va dolzarbligi",
                  methodology: "Metodologiya va yondashuv",
                  structureClarity: "Tuzilishi va fikrning aniqligi",
                  originality: "Originallik va yangilik darajasi"
                }).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-3">
                      <label className="font-medium text-slate-700">{label}</label>
                      <div className="flex items-center gap-3">
                        <button 
                          type="button" 
                          disabled={isReadOnly} 
                          className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                          onClick={() => handleScoreChange(key, scores[key as keyof typeof scores] - 1)}
                        >-</button>
                        <span className="text-xl font-bold font-serif text-primary w-10 text-center">
                          {scores[key as keyof typeof scores]}
                        </span>
                        <button 
                          type="button" 
                          disabled={isReadOnly} 
                          className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                          onClick={() => handleScoreChange(key, scores[key as keyof typeof scores] + 1)}
                        >+</button>
                      </div>
                    </div>
                    <div className="relative pt-2">
                      <input 
                        type="range" 
                        min="1" max="10" 
                        value={scores[key as keyof typeof scores]}
                        onChange={(e) => setScores({...scores, [key]: Number(e.target.value)})}
                        disabled={isReadOnly}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                        <span>5</span>
                        <span>6</span>
                        <span>7</span>
                        <span>8</span>
                        <span>9</span>
                        <span>10</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 mb-6 shadow-sm border border-border bg-white">
              <h3 className="text-lg font-bold font-serif mb-6 border-b border-slate-100 pb-2 text-slate-800">2. Fikr va mulohazalar</h3>
              <div className="space-y-6">
                <div>
                  <label className="block font-medium mb-2 text-slate-700">Muallif uchun izohlar <span className="text-slate-400 font-normal text-sm ml-1">(Muallif buni ko'radi)</span></label>
                  <Textarea 
                    value={comments.commentsForAuthor}
                    onChange={e => setComments({...comments, commentsForAuthor: e.target.value})}
                    disabled={isReadOnly}
                    className="min-h-[150px] bg-slate-50"
                    placeholder="Ishning kuchli va zaif tomonlari, tuzatish bo'yicha takliflar..."
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2 text-slate-700">Muharrir uchun yopiq izohlar <span className="text-slate-400 font-normal text-sm ml-1">(Faqat muharrir ko'radi)</span></label>
                  <Textarea 
                    value={comments.commentsForEditor}
                    onChange={e => setComments({...comments, commentsForEditor: e.target.value})}
                    disabled={isReadOnly}
                    className="min-h-[100px] bg-amber-50/50 border-amber-200 focus-visible:ring-amber-500"
                    placeholder="Qo'shimcha maxfiy xulosalar..."
                  />
                </div>
              </div>
            </Card>

            <Card className="p-8 mb-8 border-t-4 border-t-primary shadow-md bg-white">
              <h3 className="text-lg font-bold font-serif mb-6 text-slate-800">3. Yakuniy Xulosa</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {verdictOptions.map(v => (
                  <label key={v.id} className={`cursor-pointer flex flex-col items-center justify-center p-6 rounded-xl border-2 font-bold text-center transition-all ${verdict === v.id ? `border-${v.color}-500 bg-${v.color}-50 text-${v.color}-700 ring-2 ring-${v.color}-500/20 shadow-sm` : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                    <input type="radio" name="verdict" className="hidden" value={v.id} checked={verdict === v.id} onChange={() => setVerdict(v.id)} disabled={isReadOnly} />
                    <v.icon className={`h-8 w-8 mb-3 ${verdict === v.id ? `text-${v.color}-600` : 'text-slate-400'}`} />
                    {v.label}
                  </label>
                ))}
              </div>
            </Card>

            {!isReadOnly && (
              <div className="flex justify-end sticky bottom-6 z-10">
                <Button type="submit" size="lg" className="shadow-xl shadow-primary/30 text-lg px-10 h-14 bg-primary text-white hover:bg-primary/90" disabled={submitMutation.isPending}>
                  <Send className="mr-3 h-5 w-5" />
                  {submitMutation.isPending ? "Yuborilmoqda..." : "Taqrizni Yuborish"}
                </Button>
              </div>
            )}
          </form>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
