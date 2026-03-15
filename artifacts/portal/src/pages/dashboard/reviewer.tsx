import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetReviews } from "@workspace/api-client-react";
import { Button, Card, Badge, PageTransition } from "@/components/ui/shared";
import { formatDate, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { ClipboardEdit, FileCheck, Clock, FileText } from "lucide-react";

export default function ReviewerDashboard() {
  const { data: reviews, isLoading } = useGetReviews();
  const [location] = useLocation();

  const pending = reviews?.filter(r => r.status === 'pending') || [];
  const submitted = reviews?.filter(r => r.status === 'submitted') || [];

  const isHistory = location === "/dashboard/reviewer/history";

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary">
              {isHistory ? "Taqrizlar Tarixi" : "Ekspert Paneli"}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isHistory ? "Siz tomonidan bajarilgan barcha taqrizlar." : "Sizga biriktirilgan ishlarni baholang."}
            </p>
          </div>
        </div>

        {!isHistory ? (
          <div className="space-y-8 animate-in fade-in">
            {/* Pending Reviews */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-100">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold font-serif text-slate-800">Kutib turgan topshiriqlar</h3>
                <Badge className="bg-orange-100 text-orange-800 border-orange-200 ml-auto">{pending.length}</Badge>
              </div>
              
              {isLoading ? (
                <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
              ) : pending.length === 0 ? (
                <Card className="p-16 text-center border-dashed border-2 bg-slate-50/50">
                  <FileCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Hozircha baholash uchun ishlar yo'q.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pending.map(review => (
                    <Card key={review.id} className="p-6 border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all bg-white flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Taqriz id: #{review.id}</span>
                        <span className="text-xs text-slate-500 font-medium">{formatDate(review.assignedAt)}</span>
                      </div>
                      <h4 className="text-lg font-bold mb-6 text-slate-900 line-clamp-2 flex-1">{review.submissionTitle}</h4>
                      <Link href={`/reviews/${review.id}`}>
                        <Button className="w-full bg-primary text-white hover:bg-primary/90 shadow-sm h-12 text-base">
                          <ClipboardEdit className="mr-2 h-5 w-5" /> Taqriz yozishni boshlash
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
            {/* Submitted Reviews History */}
            <section>
              <Card className="border border-border shadow-sm overflow-hidden bg-white">
                <div className="px-6 py-5 border-b border-border bg-slate-50 flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-bold font-serif text-slate-800">Bajarilgan taqrizlar</h3>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 ml-auto">{submitted.length}</Badge>
                </div>
                
                {isLoading ? (
                  <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : submitted.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                    <FileText className="h-12 w-12 text-slate-300 mb-4" />
                    Tarix bo'sh.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs tracking-wider border-b border-border">
                        <tr>
                          <th className="px-6 py-4 font-semibold w-1/2">Sarlavha</th>
                          <th className="px-6 py-4 font-semibold">Sana</th>
                          <th className="px-6 py-4 font-semibold">Xulosa</th>
                          <th className="px-6 py-4 font-semibold text-right">Amal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {submitted.map(review => (
                          <tr key={review.id} className="hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-6 py-4 font-medium text-slate-900">{review.submissionTitle}</td>
                            <td className="px-6 py-4 text-slate-600">{formatDate(review.submittedAt)}</td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={`px-2.5 py-1 ${
                                review.verdict === 'accept' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                review.verdict === 'minor_revision' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                review.verdict === 'major_revision' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {review.verdict?.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link href={`/reviews/${review.id}`}>
                                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">Ko'rish</Button>
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
