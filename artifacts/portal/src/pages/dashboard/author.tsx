import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetSubmissions } from "@workspace/api-client-react";
import { Button, Card, Badge, PageTransition } from "@/components/ui/shared";
import { PlusCircle, FileText, CheckCircle, Clock, AlertCircle, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { STATUS_LABELS, STATUS_COLORS, formatDate, LITERATURE_TYPES } from "@/lib/utils";

export default function AuthorDashboard() {
  const { data, isLoading } = useGetSubmissions({ limit: 50 });

  const submissions = data?.items || [];
  
  const stats = {
    total: submissions.length,
    underReview: submissions.filter(s => ['submitted', 'under_review'].includes(s.status)).length,
    accepted: submissions.filter(s => ['accepted', 'published'].includes(s.status)).length,
    revision: submissions.filter(s => s.status === 'revision_required').length,
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary">Muallif Paneli</h2>
            <p className="text-muted-foreground mt-1">Ilmiy ishlaringiz holatini kuzating va yangi ishlarni yuboring.</p>
          </div>
          <Link href="/submissions/new">
            <Button size="lg" className="shadow-lg shadow-primary/20 hover:-translate-y-0.5 bg-primary text-white">
              <PlusCircle className="mr-2 h-5 w-5" />
              Yangi ariza yuborish
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard title="Jami yuborilgan" value={stats.total} icon={<FileText />} color="blue" />
          <StatCard title="Ko'rib chiqilmoqda" value={stats.underReview} icon={<Clock />} color="amber" />
          <StatCard title="Tuzatish kerak" value={stats.revision} icon={<AlertCircle />} color="orange" />
          <StatCard title="Qabul qilingan" value={stats.accepted} icon={<CheckCircle />} color="emerald" />
        </div>

        {/* Submissions List */}
        <Card className="p-0 border border-border shadow-md overflow-hidden bg-white">
          <div className="px-6 py-5 border-b border-border bg-slate-50 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold font-serif text-slate-800">Mening qo'lyozmalarim</h3>
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              Yuklanmoqda...
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-slate-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Hali hech qanday ariza yuborilmagan</h4>
              <p className="text-slate-500 max-w-md mb-6">Yangi darslik, monografiya yoki qo'llanma yuborish uchun yuqoridagi tugmadan foydalaning.</p>
              <Link href="/submissions/new">
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">Yangi ariza</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs tracking-wider border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-1/3">Sarlavha</th>
                    <th className="px-6 py-4 font-semibold">Turi</th>
                    <th className="px-6 py-4 font-semibold">Holati</th>
                    <th className="px-6 py-4 font-semibold">Yuborilgan sana</th>
                    <th className="px-6 py-4 font-semibold text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.map((sub, idx) => (
                    <tr key={sub.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 line-clamp-2">{sub.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{sub.scientificDirection}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                          {LITERATURE_TYPES[sub.literatureType as keyof typeof LITERATURE_TYPES]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`rounded-full px-3 py-0.5 border ${STATUS_COLORS[sub.status as keyof typeof STATUS_COLORS]}`}>
                          {STATUS_LABELS[sub.status as keyof typeof STATUS_LABELS]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(sub.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 group">
                          Batafsil
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

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
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
