import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetAdminStats,
  useGetUsers,
  useUpdateUserRole,
  useGetDepartments,
  useCreateDepartment,
  useDeleteDepartment,
  useGetScientificDirections,
  useCreateScientificDirection,
  useDeleteScientificDirection,
  useUpdateEmailTemplate,
  getGetAuditLogsQueryOptions,
  getGetEmailTemplatesQueryOptions,
} from "@workspace/api-client-react";
import { Card, PageTransition, LoadingSpinner, Badge, Select, Button, Input } from "@/components/ui/shared";
import {
  Users, FileText, CheckCircle, Shield, Search, Trash2, Plus, Activity,
  BookOpen, Mail, Settings2, LayoutDashboard, AlertCircle, Clock, Eye,
  Edit3, Send, RefreshCw, X, Save, ToggleLeft, ToggleRight, PieChart as PieIcon,
  TrendingUp, UserCheck, Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

/* ── helpers ── */
function getSection(path: string) {
  const m = path.match(/^\/dashboard\/admin\/?([^/]*)$/);
  return m?.[1] || "overview";
}

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  admin:    { label: "Admin",     cls: "bg-red-50 text-red-700 border-red-200" },
  editor:   { label: "Muharrir",  cls: "bg-violet-50 text-violet-700 border-violet-200" },
  reviewer: { label: "Taqrizchi", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  author:   { label: "Muallif",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

const ACTION_META: Record<string, { icon: any; color: string; label: string }> = {
  user_login:                 { icon: UserCheck,  color: "bg-blue-100 text-blue-700",    label: "Tizimga kirish" },
  user_logout:                { icon: X,          color: "bg-slate-100 text-slate-600",   label: "Tizimdan chiqish" },
  user_registered:            { icon: Users,      color: "bg-emerald-100 text-emerald-700", label: "Yangi foydalanuvchi" },
  role_changed:               { icon: Shield,     color: "bg-violet-100 text-violet-700", label: "Rol o'zgartirildi" },
  submission_created:         { icon: FileText,   color: "bg-blue-100 text-blue-700",    label: "Yangi ariza" },
  submission_status_changed:  { icon: Activity,   color: "bg-amber-100 text-amber-700",  label: "Ariza holati" },
  email_template_updated:     { icon: Mail,       color: "bg-pink-100 text-pink-700",    label: "Shablon yangilandi" },
};

/* ════════════════════════════════ COMPONENT ════════════════════════════════ */
export default function AdminDashboard() {
  const [location] = useLocation();
  const section = getSection(location);
  const qc = useQueryClient();
  const { toast } = useToast();

  /* ── Data ── */
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetAdminStats();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useGetUsers();
  const { data: departments, refetch: refetchDepts } = useGetDepartments();
  const { data: directions, refetch: refetchDirs } = useGetScientificDirections();
  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useQuery(
    getGetAuditLogsQueryOptions({ limit: 100 })
  );
  const { data: emailTemplates, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery(
    getGetEmailTemplatesQueryOptions()
  );

  /* ── Mutations ── */
  const updateRoleMutation = useUpdateUserRole();
  const createDeptMutation = useCreateDepartment();
  const deleteDeptMutation = useDeleteDepartment();
  const createDirMutation  = useCreateScientificDirection();
  const deleteDirMutation  = useDeleteScientificDirection();
  const updateTemplateMutation = useUpdateEmailTemplate();

  /* ── Local state ── */
  const [userSearch,  setUserSearch]  = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDirName,  setNewDirName]  = useState("");
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);
  const [templateEdits, setTemplateEdits] = useState<{ subject: string; body: string } | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  /* ── Handlers ── */
  async function handleRoleChange(id: number, role: string) {
    try {
      await updateRoleMutation.mutateAsync({ id, data: { role: role as any } });
      toast({ title: "Muvaffaqiyatli", description: "Foydalanuvchi roli o'zgardi" });
      refetchUsers();
      refetchStats();
    } catch {
      toast({ title: "Xatolik", description: "Rolni o'zgartirishda xatolik", variant: "destructive" });
    }
  }

  async function handleCreateDept(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await createDeptMutation.mutateAsync({ data: { name: newDeptName.trim() } });
      setNewDeptName("");
      refetchDepts();
      toast({ title: "Qo'shildi", description: "Kafedra qo'shildi" });
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  }

  async function handleDeleteDept(id: number, name: string) {
    if (!confirm(`"${name}" kafedrini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await deleteDeptMutation.mutateAsync({ id });
      refetchDepts();
      toast({ title: "O'chirildi" });
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  }

  async function handleCreateDir(e: React.FormEvent) {
    e.preventDefault();
    if (!newDirName.trim()) return;
    try {
      await createDirMutation.mutateAsync({ data: { name: newDirName.trim() } });
      setNewDirName("");
      refetchDirs();
      toast({ title: "Qo'shildi", description: "Yo'nalish qo'shildi" });
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  }

  async function handleDeleteDir(id: number, name: string) {
    if (!confirm(`"${name}" yo'nalishini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await deleteDirMutation.mutateAsync({ id });
      refetchDirs();
      toast({ title: "O'chirildi" });
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  }

  function startEditTemplate(tpl: any) {
    setEditingTemplate(tpl.id);
    setTemplateEdits({ subject: tpl.subject, body: tpl.body });
  }

  async function saveTemplate(id: number) {
    if (!templateEdits) return;
    try {
      await updateTemplateMutation.mutateAsync({ id, data: templateEdits });
      setEditingTemplate(null);
      refetchTemplates();
      toast({ title: "Shablon saqlandi" });
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  }

  async function toggleTemplate(id: number, isActive: boolean) {
    try {
      await updateTemplateMutation.mutateAsync({ id, data: { isActive: !isActive } });
      refetchTemplates();
      toast({ title: isActive ? "O'chirildi" : "Yoqildi" });
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  }

  /* ── Derived data ── */
  const filteredUsers = (users ?? []).filter(u => {
    const matchSearch =
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const barData = [
    { name: "Yuborilgan",  cnt: stats?.submissionsByStatus?.submitted         ?? 0, fill: "#3b82f6" },
    { name: "Taqrizda",    cnt: stats?.submissionsByStatus?.under_review       ?? 0, fill: "#f59e0b" },
    { name: "Tuzatish",    cnt: stats?.submissionsByStatus?.revision_required  ?? 0, fill: "#f97316" },
    { name: "Qabul",       cnt: stats?.submissionsByStatus?.accepted            ?? 0, fill: "#10b981" },
    { name: "Rad",         cnt: stats?.submissionsByStatus?.rejected            ?? 0, fill: "#ef4444" },
    { name: "Nashr",       cnt: stats?.submissionsByStatus?.published           ?? 0, fill: "#8b5cf6" },
  ];
  const pieData = barData.filter(d => d.cnt > 0);

  const userRoleStats = [
    { name: "Mualliflar",  value: stats?.totalAuthors   ?? 0, fill: "#3b82f6" },
    { name: "Taqrizchilar",value: stats?.totalReviewers ?? 0, fill: "#f59e0b" },
    { name: "Muharrirlar", value: stats?.totalEditors   ?? 0, fill: "#8b5cf6" },
    { name: "Adminlar",    value: stats?.totalAdmins    ?? 0, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <DashboardLayout>
      <PageTransition>
        {/* Page Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-bold text-primary">
              {section === "overview"        && "Statistika"}
              {section === "users"           && "👥 Foydalanuvchilar"}
              {section === "dictionaries"    && "⚙️ Lug'at Sozlamalari"}
              {section === "email-templates" && "📧 Email Shablonlari"}
              {section === "logs"            && "📜 Audit Loglari"}
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {section === "overview"        && "Tizimning umumiy holati va faoliyat statistikasi"}
              {section === "users"           && "Foydalanuvchilarni boshqarish, rollarni sozlash"}
              {section === "dictionaries"    && "Kafedralar va ilmiy yo'nalishlar ro'yxatini boshqarish"}
              {section === "email-templates" && "Avtomatik yuboriluvchi email xabarlarini sozlash"}
              {section === "logs"            && "Tizimda amalga oshirilgan barcha harakatlar tarixi"}
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* ══════════ OVERVIEW ══════════ */}
        {section === "overview" && (
          <div className="space-y-6 animate-in fade-in-0 duration-200">
            {statsLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : (
              <>
                {/* KPI Grid */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  <KpiCard label="Jami foydalanuvchilar" value={stats?.totalUsers ?? 0}        icon={Users}       accent="blue" />
                  <KpiCard label="Taqrizchilar"           value={stats?.totalReviewers ?? 0}    icon={Shield}      accent="violet" />
                  <KpiCard label="Jami arizalar"          value={stats?.totalSubmissions ?? 0}  icon={FileText}    accent="amber" />
                  <KpiCard label="Nashr qilingan"         value={stats?.published ?? 0}          icon={CheckCircle} accent="emerald" />
                </div>

                {/* Charts row */}
                <div className="grid lg:grid-cols-5 gap-5">
                  {/* Bar chart */}
                  <Card className="lg:col-span-3 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold font-serif text-slate-800">Arizalar holati bo'yicha</h3>
                      <button onClick={() => refetchStats()} className="text-muted-foreground hover:text-primary transition-colors">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                    {barData.every(d => d.cnt === 0) ? (
                      <div className="h-[240px] flex flex-col items-center justify-center text-slate-300">
                        <TrendingUp className="h-12 w-12 mb-3" />
                        <p className="text-sm text-slate-400">Ma'lumot yo'q</p>
                      </div>
                    ) : (
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                            <Bar dataKey="cnt" name="Arizalar" radius={[4, 4, 0, 0]} maxBarSize={40}>
                              {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Card>

                  {/* Pie chart */}
                  <Card className="lg:col-span-2 p-6">
                    <h3 className="font-bold font-serif text-slate-800 mb-5">Foydalanuvchilar roli</h3>
                    {userRoleStats.length === 0 ? (
                      <div className="h-[240px] flex flex-col items-center justify-center text-slate-300">
                        <PieIcon className="h-12 w-12 mb-3" />
                        <p className="text-sm text-slate-400">Ma'lumot yo'q</p>
                      </div>
                    ) : (
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={userRoleStats} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={85} innerRadius={45} paddingAngle={3}>
                              {userRoleStats.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Yangi arizalar", value: stats?.submissionsByStatus?.submitted ?? 0,      color: "text-blue-600",    bg: "bg-blue-50" },
                    { label: "Taqriz jarayonida", value: stats?.submissionsByStatus?.under_review ?? 0, color: "text-amber-600",   bg: "bg-amber-50" },
                    { label: "Tuzatish kerak",  value: stats?.submissionsByStatus?.revision_required ?? 0, color: "text-orange-600", bg: "bg-orange-50" },
                    { label: "Qabul qilingan",  value: stats?.submissionsByStatus?.accepted ?? 0,       color: "text-emerald-600", bg: "bg-emerald-50" },
                  ].map(item => (
                    <div key={item.label} className={cn("rounded-xl p-4 flex items-center justify-between", item.bg)}>
                      <p className="text-xs font-medium text-slate-600">{item.label}</p>
                      <p className={cn("text-2xl font-bold", item.color)}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════ USER MANAGEMENT ══════════ */}
        {section === "users" && (
          <div className="animate-in fade-in-0 duration-200 space-y-4">
            {/* Summary chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all",      label: `Barchasi (${users?.length ?? 0})`,            cls: "bg-slate-100 text-slate-700 border-slate-200" },
                { key: "author",   label: `Mualliflar (${users?.filter(u=>u.role==="author").length ?? 0})`,    cls: "bg-blue-50 text-blue-700 border-blue-200" },
                { key: "reviewer", label: `Taqrizchilar (${users?.filter(u=>u.role==="reviewer").length ?? 0})`, cls: "bg-amber-50 text-amber-700 border-amber-200" },
                { key: "editor",   label: `Muharrirlar (${users?.filter(u=>u.role==="editor").length ?? 0})`,   cls: "bg-violet-50 text-violet-700 border-violet-200" },
                { key: "admin",    label: `Adminlar (${users?.filter(u=>u.role==="admin").length ?? 0})`,       cls: "bg-red-50 text-red-700 border-red-200" },
              ].map(chip => (
                <button
                  key={chip.key}
                  onClick={() => setRoleFilter(chip.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    chip.cls,
                    roleFilter === chip.key ? "ring-2 ring-offset-1 ring-primary/40 shadow-sm" : "opacity-80 hover:opacity-100"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <Card className="overflow-hidden shadow-sm">
              {/* Table header */}
              <div className="px-5 py-4 border-b border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold font-serif text-slate-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Foydalanuvchilar
                  <span className="text-xs font-normal text-muted-foreground">({filteredUsers.length} ta)</span>
                </h3>
                <div className="relative w-full sm:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Ism yoki email..."
                    className="pl-9 h-9 text-sm"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                  />
                  {userSearch && (
                    <button onClick={() => setUserSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-b border-border/70">
                    <tr>
                      <th className="px-5 py-3 font-semibold">#</th>
                      <th className="px-5 py-3 font-semibold">F.I.Sh</th>
                      <th className="px-5 py-3 font-semibold">Email</th>
                      <th className="px-5 py-3 font-semibold hidden md:table-cell">Kafedra</th>
                      <th className="px-5 py-3 font-semibold">Joriy rol</th>
                      <th className="px-5 py-3 font-semibold">Ro'yxat sanasi</th>
                      <th className="px-5 py-3 font-semibold text-right">Rolni o'zgartirish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {usersLoading ? (
                      <tr><td colSpan={7} className="p-10 text-center"><LoadingSpinner /></td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={7} className="p-10 text-center text-slate-400 text-sm">Foydalanuvchilar topilmadi</td></tr>
                    ) : filteredUsers.map((user, idx) => (
                      <tr key={user.id} className={cn("transition-colors hover:bg-blue-50/30", idx % 2 === 0 ? "bg-white" : "bg-slate-50/20")}>
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{user.fullName}</p>
                              {user.position && user.position !== "teacher" && (
                                <p className="text-[11px] text-slate-400">{user.position.replace(/_/g, " ")}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-sm">{user.email}</td>
                        <td className="px-5 py-3.5 text-slate-600 text-sm hidden md:table-cell">
                          {user.departmentName || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs">{formatDate(user.createdAt)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <Select
                            className="h-8 text-xs bg-white border-border w-32 ml-auto"
                            value={user.role}
                            onChange={e => handleRoleChange(user.id, e.target.value)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <option value="author">Muallif</option>
                            <option value="reviewer">Taqrizchi</option>
                            <option value="editor">Muharrir</option>
                            <option value="admin">Admin</option>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ══════════ DICTIONARY SETTINGS ══════════ */}
        {section === "dictionaries" && (
          <div className="animate-in fade-in-0 duration-200 grid md:grid-cols-2 gap-5">
            {/* Departments */}
            <DictPanel
              title="Kafedralar"
              icon={Globe}
              count={departments?.length ?? 0}
              inputValue={newDeptName}
              onInputChange={setNewDeptName}
              onAdd={handleCreateDept}
              adding={createDeptMutation.isPending}
              placeholder="Yangi kafedra nomi..."
            >
              {(departments ?? []).map(d => (
                <DictRow key={d.id} name={d.name} onDelete={() => handleDeleteDept(d.id, d.name)} />
              ))}
            </DictPanel>

            {/* Scientific Directions */}
            <DictPanel
              title="Ilmiy yo'nalishlar"
              icon={BookOpen}
              count={directions?.length ?? 0}
              inputValue={newDirName}
              onInputChange={setNewDirName}
              onAdd={handleCreateDir}
              adding={createDirMutation.isPending}
              placeholder="Yangi yo'nalish nomi..."
            >
              {(directions ?? []).map(d => (
                <DictRow key={d.id} name={d.name} onDelete={() => handleDeleteDir(d.id, d.name)} />
              ))}
            </DictPanel>
          </div>
        )}

        {/* ══════════ EMAIL TEMPLATES ══════════ */}
        {section === "email-templates" && (
          <div className="animate-in fade-in-0 duration-200 space-y-5">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Mail className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">SMTP integratsiyasi</p>
                <p className="text-xs text-amber-600 mt-0.5">Hozircha shablonlarni tahrirlash va yoqish/o'chirish mumkin. SMTP orqali real yuborish keyingi versiyada qo'shiladi.</p>
              </div>
            </div>

            {templatesLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner /></div>
            ) : (
              <div className="space-y-3">
                {(emailTemplates ?? []).map((tpl: any) => (
                  <Card key={tpl.id} className="overflow-hidden shadow-sm">
                    {editingTemplate === tpl.id ? (
                      /* ─ Edit mode ─ */
                      <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-primary" />
                            {tpl.name} — tahrirlash
                          </h4>
                          <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">Mavzu (Subject)</label>
                          <Input
                            value={templateEdits?.subject ?? ""}
                            onChange={e => setTemplateEdits(t => t ? { ...t, subject: e.target.value } : t)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">
                            Xabar matni — o'zgaruvchilar: #{"{"}fullName{"}"}, #{"{"}title{"}"}, #{"{"}id{"}"}, #{"{"}date{"}"}
                          </label>
                          <textarea
                            value={templateEdits?.body ?? ""}
                            onChange={e => setTemplateEdits(t => t ? { ...t, body: e.target.value } : t)}
                            rows={8}
                            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>Bekor qilish</Button>
                          <Button size="sm" onClick={() => saveTemplate(tpl.id)} disabled={updateTemplateMutation.isPending}>
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                            Saqlash
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ─ View mode ─ */
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-2">
                              <Mail className={cn("h-4 w-4 shrink-0", tpl.isActive ? "text-emerald-600" : "text-slate-400")} />
                              <h4 className="font-bold text-slate-900 text-sm">{tpl.name}</h4>
                              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                                tpl.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              )}>
                                {tpl.isActive ? "Faol" : "O'chiq"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-1">
                              <span className="font-semibold text-slate-600">Kalit:</span>{" "}
                              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{tpl.key}</code>
                            </p>
                            <p className="text-xs text-slate-600 mb-1">
                              <span className="font-semibold">Mavzu:</span> {tpl.subject}
                            </p>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1">{tpl.body}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5"
                              onClick={() => toggleTemplate(tpl.id, tpl.isActive)}
                              disabled={updateTemplateMutation.isPending}
                            >
                              {tpl.isActive
                                ? <><ToggleRight className="h-3.5 w-3.5 text-emerald-600" />O'chirish</>
                                : <><ToggleLeft className="h-3.5 w-3.5" />Yoqish</>
                              }
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                              onClick={() => startEditTemplate(tpl)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Tahrirlash
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ AUDIT LOGS ══════════ */}
        {section === "logs" && (
          <div className="animate-in fade-in-0 duration-200 space-y-4">
            <Card className="overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border bg-white flex items-center justify-between">
                <h3 className="font-bold font-serif text-slate-800 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Harakatlar tarixi
                  {auditData?.total != null && (
                    <span className="text-xs font-normal text-muted-foreground">({auditData.total} ta yozuv)</span>
                  )}
                </h3>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => refetchAudit()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Yangilash
                </Button>
              </div>

              {auditLoading ? (
                <div className="flex justify-center py-16"><LoadingSpinner /></div>
              ) : !auditData?.items?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <Activity className="h-14 w-14 mb-3" />
                  <p className="text-sm text-slate-400">Hali hech qanday harakatlar qayd etilmagan</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-b border-border/70">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Harakat</th>
                        <th className="px-5 py-3 font-semibold hidden md:table-cell">Tafsilot</th>
                        <th className="px-5 py-3 font-semibold">Foydalanuvchi</th>
                        <th className="px-5 py-3 font-semibold hidden lg:table-cell">IP</th>
                        <th className="px-5 py-3 font-semibold text-right">Sana</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {auditData.items.map((log: any, idx: number) => {
                        const meta = ACTION_META[log.action] ?? { icon: Activity, color: "bg-slate-100 text-slate-500", label: log.action };
                        const Icon = meta.icon;
                        return (
                          <tr key={log.id} className={cn("hover:bg-slate-50/60 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/20")}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0", meta.color)}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-medium text-slate-800 text-sm whitespace-nowrap">{meta.label}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 text-xs max-w-[220px] truncate hidden md:table-cell">
                              {log.detail || "—"}
                            </td>
                            <td className="px-5 py-3.5">
                              <div>
                                <p className="text-xs font-medium text-slate-700">{log.userEmail || "Tizim"}</p>
                                {log.userRole && (
                                  <p className="text-[11px] text-slate-400 mt-0.5">{ROLE_MAP[log.userRole]?.label ?? log.userRole}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 text-xs font-mono hidden lg:table-cell">
                              {log.ipAddress || "—"}
                            </td>
                            <td className="px-5 py-3.5 text-right text-xs text-slate-400 whitespace-nowrap">
                              {formatDate(log.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}

/* ══════════════════ SUB-COMPONENTS ══════════════════ */

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent: string }) {
  const a: Record<string, string> = {
    blue:    "text-blue-600 bg-blue-100",
    violet:  "text-violet-600 bg-violet-100",
    amber:   "text-amber-600 bg-amber-100",
    emerald: "text-emerald-600 bg-emerald-100",
  };
  return (
    <Card className="p-5 bg-white shadow-sm hover:shadow-md transition-shadow border border-border">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-4 shrink-0", a[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </Card>
  );
}

function RoleBadge({ role }: { role: string }) {
  const r = ROLE_MAP[role];
  return (
    <Badge className={cn("border rounded-full px-2.5 py-0.5 text-xs font-semibold", r?.cls ?? "bg-slate-100 text-slate-600")}>
      {r?.label ?? role}
    </Badge>
  );
}

function DictPanel({
  title, icon: Icon, count, inputValue, onInputChange, onAdd, adding, placeholder, children
}: {
  title: string; icon: any; count: number;
  inputValue: string; onInputChange: (v: string) => void;
  onAdd: (e: React.FormEvent) => void; adding: boolean;
  placeholder: string; children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden shadow-sm bg-white">
      <div className="px-5 py-4 border-b border-border/60 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-bold font-serif text-slate-800">{title}</h3>
        </div>
        <span className="h-6 px-2.5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center">{count}</span>
      </div>
      <div className="p-5">
        <form onSubmit={onAdd} className="flex gap-2 mb-4">
          <Input
            placeholder={placeholder}
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <Button type="submit" size="sm" disabled={!inputValue.trim() || adding} className="shrink-0 gap-1">
            <Plus className="h-3.5 w-3.5" />
            Qo'shish
          </Button>
        </form>
        <div className="max-h-[400px] overflow-y-auto border border-border/50 rounded-xl divide-y divide-border/30">
          {React.Children.count(children) === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">Ro'yxat bo'sh</p>
          ) : children}
        </div>
      </div>
    </Card>
  );
}

function DictRow({ name, onDelete }: { name: string; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors group">
      <span className="text-sm text-slate-700">{name}</span>
      <button
        onClick={onDelete}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-transparent group-hover:text-slate-400 hover:!text-red-500 hover:bg-red-50 transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
