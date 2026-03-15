import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetReviews } from "@workspace/api-client-react";
import { Button, Card, Badge, PageTransition } from "@/components/ui/shared";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { ClipboardEdit, FileCheck, Clock } from "lucide-react";

export default function ReviewerDashboard() {
  const { data: reviews, isLoading } = useGetReviews();

  const pending = reviews?.filter(r => r.status === 'pending') || [];
  const submitted = reviews?.filter(r => r.status === 'submitted') || [];

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-foreground">Ekspert Paneli</h2>
          <p className="text-muted-foreground mt-1">Sizga biriktirilgan ishlarni baholang.</p>
        </div>

        <div className="space-y-12">
          {/* Pending Reviews */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold font-serif">Kutib turgan taqrizlar</h3>
              <Badge className="bg-orange-100 text-orange-800 ml-auto">{pending.length}</Badge>
            </div>
            
            {pending.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <p className="text-muted-foreground">Hozircha baholash uchun ishlar yo'q.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pending.map(review => (
                  <Card key={review.id} className="p-6 border-l-4 border-l-orange-400 hover:-translate-y-1 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-medium text-muted-foreground border border-border px-2 py-0.5 rounded">Taqriz id: #{review.id}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(review.assignedAt)}</span>
                    </div>
                    <h4 className="text-lg font-bold mb-4 line-clamp-2">{review.submissionTitle}</h4>
                    <Link href={`/reviews/${review.id}`}>
                      <Button className="w-full bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:border-orange-300" variant="outline">
                        <ClipboardEdit className="mr-2 h-4 w-4" /> Taqriz yozishni boshlash
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Submitted Reviews */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold font-serif">Bajarilgan taqrizlar</h3>
              <Badge className="bg-emerald-100 text-emerald-800 ml-auto">{submitted.length}</Badge>
            </div>
            
            {submitted.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <p className="text-muted-foreground">Tarix bo'sh.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {submitted.map(review => (
                  <Card key={review.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-emerald-400">
                    <div>
                      <h4 className="text-md font-bold">{review.submissionTitle}</h4>
                      <p className="text-sm text-muted-foreground mt-1">Yuborildi: {formatDate(review.submittedAt)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Xulosa</p>
                        <Badge className="bg-muted text-foreground border-border uppercase">
                          {review.verdict?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Link href={`/reviews/${review.id}`}>
                        <Button variant="ghost" size="sm">Ko'rish</Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
