import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetReview, useSubmitReview } from "@workspace/api-client-react";
import { Button, Card, Textarea, PageTransition, LoadingSpinner } from "@/components/ui/shared";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send } from "lucide-react";
import { Link } from "wouter";

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

  if (isLoading || !review) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const isReadOnly = review.status === 'submitted';

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="max-w-4xl mx-auto py-6">
          <Link href="/dashboard/reviewer" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Ortga qaytish
          </Link>

          <div className="mb-8">
            <h2 className="text-3xl font-serif font-bold text-foreground">Ekspert Taqrizi</h2>
            <p className="text-xl text-primary mt-2">{review.submissionTitle}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="p-8 mb-6">
              <h3 className="text-lg font-bold font-serif mb-6 border-b pb-2">1. Baholash (1-10)</h3>
              <div className="space-y-8">
                {Object.entries({
                  scientificSignificance: "Ilmiy ahamiyati va dolzarbligi",
                  methodology: "Metodologiya va yondashuv",
                  structureClarity: "Tuzilishi va fikrning aniqligi",
                  originality: "Originallik va yangilik darajasi"
                }).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-3">
                      <label className="font-medium">{label}</label>
                      <span className="text-2xl font-bold font-serif text-primary w-12 text-center bg-primary/5 rounded-lg py-1">
                        {scores[key as keyof typeof scores]}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="1" max="10" 
                      value={scores[key as keyof typeof scores]}
                      onChange={(e) => setScores({...scores, [key]: Number(e.target.value)})}
                      disabled={isReadOnly}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Juda past (1)</span>
                      <span>O'rtacha (5)</span>
                      <span>A'lo (10)</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 mb-6">
              <h3 className="text-lg font-bold font-serif mb-6 border-b pb-2">2. Fikr va mulohazalar</h3>
              <div className="space-y-6">
                <div>
                  <label className="block font-medium mb-2">Muallif uchun izohlar <span className="text-muted-foreground font-normal text-sm">(Muallif buni ko'radi)</span></label>
                  <Textarea 
                    value={comments.commentsForAuthor}
                    onChange={e => setComments({...comments, commentsForAuthor: e.target.value})}
                    disabled={isReadOnly}
                    className="min-h-[150px]"
                    placeholder="Ishning kuchli va zaif tomonlari, tuzatish bo'yicha takliflar..."
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">Muharrir uchun yopiq izohlar <span className="text-muted-foreground font-normal text-sm">(Faqat muharrir ko'radi)</span></label>
                  <Textarea 
                    value={comments.commentsForEditor}
                    onChange={e => setComments({...comments, commentsForEditor: e.target.value})}
                    disabled={isReadOnly}
                    className="min-h-[100px] bg-amber-50/30"
                    placeholder="Qo'shimcha maxfiy xulosalar..."
                  />
                </div>
              </div>
            </Card>

            <Card className="p-8 mb-8 border-l-4 border-l-primary">
              <h3 className="text-lg font-bold font-serif mb-6">3. Yakuniy Xulosa</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: 'accept', label: 'Qabul qilish', color: 'emerald' },
                  { id: 'minor_revision', label: 'Kichik tuzatishlar', color: 'blue' },
                  { id: 'major_revision', label: 'Katta tuzatishlar', color: 'orange' },
                  { id: 'reject', label: 'Rad etish', color: 'red' },
                ].map(v => (
                  <label key={v.id} className={`cursor-pointer flex items-center justify-center p-4 rounded-xl border-2 font-bold text-center transition-all ${verdict === v.id ? `border-${v.color}-500 bg-${v.color}-50 text-${v.color}-700 ring-2 ring-${v.color}-500/20` : 'border-border hover:bg-muted/50'}`}>
                    <input type="radio" name="verdict" className="hidden" value={v.id} checked={verdict === v.id} onChange={() => setVerdict(v.id)} disabled={isReadOnly} />
                    {v.label}
                  </label>
                ))}
              </div>
            </Card>

            {!isReadOnly && (
              <div className="flex justify-end sticky bottom-6 z-10">
                <Button type="submit" size="lg" className="shadow-2xl shadow-primary/30 text-lg px-10" disabled={submitMutation.isPending}>
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
