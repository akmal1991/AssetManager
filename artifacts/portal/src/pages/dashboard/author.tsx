import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetSubmissions } from "@workspace/api-client-react";
import { Button, Card, Badge, PageTransition } from "@/components/ui/shared";
import { PlusCircle, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
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
            <h2 className="text-3xl font-serif font-bold text-foreground">Muallif Paneli</h2>
            <p className="text-muted-foreground mt-1">Ilmiy ishlaringiz holatini kuzating va yangi ishlarni yuboring.</p>
          </div>
          <Link href="/submissions/new">
            <Button size="lg" className="shadow-lg shadow-primary/25 hover:-translate-y-0.5">
              <PlusCircle className="mr-2 h-5 w-5" />
              Yangi asar yuborish
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard title="Jami yuborilgan" value={stats.total} icon={<FileText className="text-blue-500" />} />
          <StatCard title="Ko'rib chiqilmoqda" value={stats.underReview} icon={<Clock className="text-yellow-500" />} />
          <StatCard title="Tuzatish kerak" value={stats.revision} icon={<AlertCircle className="text-orange-500" />} />
          <StatCard title="Qabul qilingan" value={stats.accepted} icon={<CheckCircle className="text-emerald-500" />} />
        </div>

        {/* Submissions List */}
        <Card className="p-0 border-0 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-border/50 bg-muted/30">
            <h3 className="text-xl font-bold font-serif text-foreground">Mening ilmiy ishlarim</h3>
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Yuklanmoqda...</div>
          ) : submissions.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Hali hech qanday ish yuborilmagan</h4>
              <p className="text-muted-foreground max-w-md mb-6">Yangi darslik, monografiya yoki qo'llanma yuborish uchun yuqoridagi tugmadan foydalaning.</p>
              <Link href="/submissions/new">
                <Button variant="outline">Yangi yuborish</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-6 hover:bg-muted/20 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={STATUS_COLORS[sub.status as keyof typeof STATUS_COLORS]}>
                        {STATUS_LABELS[sub.status as keyof typeof STATUS_LABELS]}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-medium border border-border px-2 py-0.5 rounded-md">
                        {LITERATURE_TYPES[sub.literatureType as keyof typeof LITERATURE_TYPES]}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-foreground truncate">{sub.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{sub.scientificDirection}</span>
                      <span>•</span>
                      <span>{formatDate(sub.createdAt)}</span>
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 group">
                    Batafsil
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageTransition>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <Card className="p-6 flex items-center gap-5 hover:shadow-xl transition-shadow duration-300">
      <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center shadow-inner">
        {React.cloneElement(icon as React.ReactElement, { className: "h-7 w-7" })}
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground font-serif">{value}</p>
        <p className="text-sm font-medium text-muted-foreground mt-1">{title}</p>
      </div>
    </Card>
  );
}

// Ensure icons import correctly by duplicating the ArrowRight import from lucide-react if needed, or using it if already in scope.
import { ArrowRight } from "lucide-react";
