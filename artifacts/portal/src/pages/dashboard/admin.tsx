import React, { useState } from "react";
import { useLocation } from "wouter";
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
} from "@workspace/api-client-react";
import { Card, PageTransition, LoadingSpinner, Badge, Select, Button, Input } from "@/components/ui/shared";
import {
  Users, FileText, CheckCircle, PieChart, Shield, Search, Trash2, Plus,
  Activity, BookOpen, Mail, Settings2, LayoutDashboard, AlertCircle, Clock,
  Eye, Edit3, Send, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";

function getSection(location: string): string {
  const match = location.match(/^\/dashboard\/admin\/?([^/]*)$/);
  const seg = match?.[1] || "";
  return seg || "overview";
}

export default function AdminDashboard() {
  const [location] = useLocation();
  const section = getSection(location);

  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useGetUsers();
  const { data: departments, refetch: refetchDepts } = useGetDepartments();
  const { data: directions, refetch: refetchDirs } = useGetScientificDirections();

  const updateRoleMutation = useUpdateUserRole();
  const createDeptMutation = useCreateDepartment();
  const deleteDeptMutation = useDeleteDepartment();
  const createDirMutation = useCreateScientificDirection();
  const deleteDirMutation = useDeleteScientificDirection();

  const [userSearch, setUserSearch] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDirName, setNewDirName] = useState("");

  const { toast } = useToast();

  const handleRoleChange = async (id: number, role: any) => {
    try {
      await updateRoleMutation.mutateAsync({ id, data: { role } });
      toast({ title: "Muvaffaqiyatli", description: "Foydalanuvchi roli o'zgardi" });
      refetchUsers();
    } catch {
      toast({ title: "Xatolik", description: "Rolni o'zgartirishda xatolik", variant: "destructive" });
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await createDeptMutation.mutateAsync({ data: { name: newDeptName.trim() } });
      setNewDeptName("");
      refetchDepts();
      toast({ title: "Muvaffaqiyatli", description: "Kafedra qo'shildi" });
    } catch {
      toast({ title: "Xatolik", description: "Kafedra qo'shishda xatolik", variant: "destructive" });
    }
  };

  const handleDeleteDept = async (id: number) => {
    if (!confirm("Bu kafedrni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDeptMutation.mutateAsync({ id });
      refetchDepts();
      toast({ title: "O'chirildi", description: "Kafedra o'chirildi" });
    } catch {
      toast({ title: "Xatolik", description: "O'chirishda xatolik", variant: "destructive" });
    }
  };

  const handleCreateDir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirName.trim()) return;
    try {
      await createDirMutation.mutateAsync({ data: { name: newDirName.trim() } });
      setNewDirName("");
      refetchDirs();
      toast({ title: "Muvaffaqiyatli", description: "Yo'nalish qo'shildi" });
    } catch {
      toast({ title: "Xatolik", description: "Yo'nalish qo'shishda xatolik", variant: "destructive" });
    }
  };

  const handleDeleteDir = async (id: number) => {
    if (!confirm("Bu yo'nalishni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDirMutation.mutateAsync({ id });
      refetchDirs();
      toast({ title: "O'chirildi", description: "Yo'nalish o'chirildi" });
    } catch {
      toast({ title: "Xatolik", description: "O'chirishda xatolik", variant: "destructive" });
    }
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const barData = [
    { name: "Yuborilgan", count: stats?.submissionsByStatus?.submitted || 0, fill: "#3b82f6" },
    { name: "Taqrizda", count: stats?.submissionsByStatus?.under_review || 0, fill: "#f59e0b" },
    { name: "Tuzatish", count: stats?.submissionsByStatus?.revision_required || 0, fill: "#f97316" },
    { name: "Qabul", count: stats?.submissionsByStatus?.accepted || 0, fill: "#10b981" },
    { name: "Rad etilgan", count: stats?.submissionsByStatus?.rejected || 0, fill: "#ef4444" },
    { name: "Nashr", count: stats?.submissionsByStatus?.published || 0, fill: "#8b5cf6" },
  ];

  const pieData = barData.filter((d) => d.count > 0);

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-primary">Tizim Administratori</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {section === "overview" && "Umumiy statistika va tizim holati"}
              {section === "users" && "Foydalanuvchilarni boshqarish va rolarni sozlash"}
              {section === "dictionaries" && "Kafedralar va ilmiy yo'nalishlar ro'yxatini boshqarish"}
              {section === "email-templates" && "Avtomatik email xabarnomalarini sozlash"}
              {section === "logs" && "Tizim foydalanuvchi harakatlari tarixi"}
            </p>
          </div>
          <div className="h-11 w-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* ─── OVERVIEW ─── */}
        {section === "overview" && (
          <div className="space-y-8 animate-in fade-in-0 duration-300">
            {statsLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
                  <KpiCard label="Jami foydalanuvchilar" value={stats?.totalUsers || 0} icon={Users} accent="blue" />
                  <KpiCard label="Taqrizchilar" value={stats?.totalReviewers || 0} icon={Shield} accent="violet" />
                  <KpiCard label="Jami arizalar" value={stats?.totalSubmissions || 0} icon={FileText} accent="amber" />
                  <KpiCard label="Nashr qilingan" value={stats?.published || 0} icon={CheckCircle} accent="emerald" />
                </div>

                {/* Charts */}
                <div className="grid lg:grid-cols-5 gap-6">
                  <Card className="lg:col-span-3 p-6">
                    <h3 className="text-base font-bold font-serif mb-5 text-slate-800">Arizalar holati bo'yicha</h3>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip
                            cursor={{ fill: "#f8fafc" }}
                            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0/0.08)" }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
                            {barData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="lg:col-span-2 p-6">
                    <h3 className="text-base font-bold font-serif mb-5 text-slate-800">Taqsimot</h3>
                    {pieData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[260px] text-slate-400">
                        <PieChart className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm">Ma'lumot yo'q</p>
                      </div>
                    ) : (
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                              {pieData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── USER MANAGEMENT ─── */}
        {section === "users" && (
          <div className="animate-in fade-in-0 duration-300 space-y-4">
            {/* Role summary chips */}
            <div className="flex flex-wrap gap-3 mb-2">
              {[
                { role: "author", label: "Mualliflar", color: "bg-blue-50 text-blue-700 border-blue-100" },
                { role: "reviewer", label: "Taqrizchilar", color: "bg-amber-50 text-amber-700 border-amber-100" },
                { role: "editor", label: "Muharrirlar", color: "bg-violet-50 text-violet-700 border-violet-100" },
                { role: "admin", label: "Adminlar", color: "bg-red-50 text-red-700 border-red-100" },
              ].map(({ role, label, color }) => (
                <div key={role} className={cn("flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold", color)}>
                  <Users className="h-3.5 w-3.5" />
                  {label}: {users?.filter((u) => u.role === role).length ?? "—"}
                </div>
              ))}
            </div>

            <Card className="overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-bold font-serif text-slate-800 flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-primary" />
                  Foydalanuvchilar ro'yxati
                  <span className="text-xs font-normal text-muted-foreground ml-1">({filteredUsers?.length ?? 0})</span>
                </h3>
                <div className="relative w-full sm:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ism yoki email bo'yicha izlash..."
                    className="pl-9 h-9 text-sm"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-b border-border/70">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">#</th>
                      <th className="px-5 py-3.5 font-semibold">F.I.Sh</th>
                      <th className="px-5 py-3.5 font-semibold">Email</th>
                      <th className="px-5 py-3.5 font-semibold">Kafedra / Daraja</th>
                      <th className="px-5 py-3.5 font-semibold">Joriy rol</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Rolni o'zgartirish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center">
                          <LoadingSpinner />
                        </td>
                      </tr>
                    ) : filteredUsers?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400 text-sm">
                          Foydalanuvchilar topilmadi
                        </td>
                      </tr>
                    ) : (
                      filteredUsers?.map((user, idx) => (
                        <tr key={user.id} className={cn("transition-colors hover:bg-slate-50/80", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                          <td className="px-5 py-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                {user.fullName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-900">{user.fullName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-500">{user.email}</td>
                          <td className="px-5 py-4">
                            <p className="text-slate-800 text-sm">{user.departmentName || <span className="text-slate-400">—</span>}</p>
                            {user.scientificDegree && user.scientificDegree !== "none" && (
                              <p className="text-xs text-slate-400 mt-0.5">{user.scientificDegree}</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <RoleBadge role={user.role} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Select
                              className="h-8 text-xs bg-white border-border w-32 ml-auto"
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              disabled={updateRoleMutation.isPending}
                            >
                              <option value="author">Muallif</option>
                              <option value="reviewer">Taqrizchi</option>
                              <option value="editor">Muharrir</option>
                              <option value="admin">Admin</option>
                            </Select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ─── DICTIONARIES ─── */}
        {section === "dictionaries" && (
          <div className="animate-in fade-in-0 duration-300 grid md:grid-cols-2 gap-6">
            {/* Departments */}
            <DictPanel
              title="Kafedralar"
              icon={BookOpen}
              count={departments?.length || 0}
              inputValue={newDeptName}
              onInputChange={setNewDeptName}
              onAdd={handleCreateDept}
              adding={createDeptMutation.isPending}
              placeholder="Yangi kafedra nomi..."
            >
              {departments?.map((d) => (
                <DictRow
                  key={d.id}
                  name={d.name}
                  onDelete={() => handleDeleteDept(d.id)}
                  deleting={deleteDeptMutation.isPending}
                />
              ))}
            </DictPanel>

            {/* Scientific Directions */}
            <DictPanel
              title="Ilmiy yo'nalishlar"
              icon={PieChart}
              count={directions?.length || 0}
              inputValue={newDirName}
              onInputChange={setNewDirName}
              onAdd={handleCreateDir}
              adding={createDirMutation.isPending}
              placeholder="Yangi yo'nalish nomi..."
            >
              {directions?.map((d) => (
                <DictRow
                  key={d.id}
                  name={d.name}
                  onDelete={() => handleDeleteDir(d.id)}
                  deleting={deleteDirMutation.isPending}
                />
              ))}
            </DictPanel>
          </div>
        )}

        {/* ─── EMAIL TEMPLATES ─── */}
        {section === "email-templates" && (
          <div className="animate-in fade-in-0 duration-300 space-y-5">
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {EMAIL_TEMPLATES.map((tpl) => (
                <EmailTemplateCard key={tpl.id} template={tpl} />
              ))}
            </div>

            <Card className="p-5 border-dashed border-2 border-primary/20 bg-primary/3 text-center">
              <Mail className="h-8 w-8 text-primary/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 mb-1">SMTP sozlamalari</p>
              <p className="text-xs text-slate-500 mb-4">Email xabarlar yuborish uchun pochta serverini sozlang</p>
              <div className="grid sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">SMTP Server</label>
                  <Input placeholder="smtp.uni.uz" className="h-8 text-sm bg-white" disabled />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Port</label>
                  <Input placeholder="587" className="h-8 text-sm bg-white" disabled />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Login</label>
                  <Input placeholder="noreply@uni.uz" className="h-8 text-sm bg-white" disabled />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Parol</label>
                  <Input placeholder="••••••••" type="password" className="h-8 text-sm bg-white" disabled />
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-4 font-medium">⚙️ SMTP integratsiyasi keyingi versiyada qo'shiladi</p>
            </Card>
          </div>
        )}

        {/* ─── AUDIT LOGS ─── */}
        {section === "logs" && (
          <div className="animate-in fade-in-0 duration-300 space-y-4">
            <Card className="overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-white flex items-center justify-between">
                <h3 className="text-base font-bold font-serif text-slate-800 flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-primary" />
                  Tizim harakatlari tarixi
                </h3>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Yangilash
                </Button>
              </div>

              <div className="divide-y divide-border/60">
                {MOCK_AUDIT_LOGS.map((log, idx) => (
                  <div key={idx} className={cn("px-6 py-4 flex items-start gap-4 text-sm hover:bg-slate-50/60 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/20")}>
                    <div className={cn("mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0", log.color)}>
                      <log.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{log.action}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{log.detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500 font-medium">{log.user}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-border bg-slate-50 text-center">
                <p className="text-xs text-slate-400">
                  Real-time audit log integratsiyasi keyingi versiyada qo'shiladi. Hozircha namuna ko'rinishida.
                </p>
              </div>
            </Card>
          </div>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}

/* ─── SUB COMPONENTS ─── */

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent: string }) {
  const accents: Record<string, { bg: string; icon: string; num: string }> = {
    blue:    { bg: "bg-blue-50",    icon: "text-blue-600 bg-blue-100",    num: "text-blue-900" },
    violet:  { bg: "bg-violet-50",  icon: "text-violet-600 bg-violet-100", num: "text-violet-900" },
    amber:   { bg: "bg-amber-50",   icon: "text-amber-600 bg-amber-100",   num: "text-amber-900" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600 bg-emerald-100",num: "text-emerald-900" },
  };
  const a = accents[accent] || accents.blue;

  return (
    <Card className="p-5 bg-white border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-4", a.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className={cn("text-3xl font-bold font-sans mb-1", a.num)}>{value}</p>
      <p className="text-xs font-medium text-slate-500 leading-snug">{label}</p>
    </Card>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin:    "bg-red-50 text-red-700 border-red-200",
    editor:   "bg-violet-50 text-violet-700 border-violet-200",
    reviewer: "bg-amber-50 text-amber-700 border-amber-200",
    author:   "bg-blue-50 text-blue-700 border-blue-200",
  };
  const labels: Record<string, string> = {
    admin: "Admin", editor: "Muharrir", reviewer: "Taqrizchi", author: "Muallif",
  };
  return (
    <Badge className={cn("border rounded-full px-2.5 py-0.5 text-xs font-semibold", map[role] || map.author)}>
      {labels[role] || role}
    </Badge>
  );
}

function DictPanel({
  title, icon: Icon, count, inputValue, onInputChange, onAdd, adding, placeholder, children
}: {
  title: string; icon: any; count: number;
  inputValue: string; onInputChange: (v: string) => void;
  onAdd: (e: React.FormEvent) => void; adding: boolean; placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden shadow-sm bg-white">
      <div className="px-5 py-4 border-b border-border bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4.5 w-4.5 text-primary" />
          <h3 className="font-bold font-serif text-slate-800">{title}</h3>
        </div>
        <span className="h-6 px-2.5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center">{count}</span>
      </div>
      <div className="p-5">
        <form onSubmit={onAdd} className="flex gap-2 mb-4">
          <Input
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <Button type="submit" size="sm" disabled={!inputValue.trim() || adding} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Qo'shish
          </Button>
        </form>
        <div className="max-h-[380px] overflow-y-auto border border-border/60 rounded-xl divide-y divide-border/40">
          {(Array.isArray(children) ? children : [children]).length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">Ro'yxat bo'sh</p>
          ) : children}
        </div>
      </div>
    </Card>
  );
}

function DictRow({ name, onDelete, deleting }: { name: string; onDelete: () => void; deleting: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
      <span className="text-sm text-slate-800">{name}</span>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function EmailTemplateCard({ template }: { template: typeof EMAIL_TEMPLATES[0] }) {
  const statusColors: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft:  "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <Card className="p-5 bg-white shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", template.iconBg)}>
          <template.icon className={cn("h-5 w-5", template.iconColor)} />
        </div>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", statusColors[template.status])}>
          {template.status === "active" ? "Faol" : "Qoralama"}
        </span>
      </div>
      <h4 className="font-bold text-slate-900 text-sm mb-1">{template.name}</h4>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">{template.description}</p>
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <Send className="h-3 w-3" />
        <span>Mavzu: <span className="text-slate-600 font-medium">{template.subject}</span></span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs h-8 gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Ko'rish
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
          <Edit3 className="h-3.5 w-3.5" />
          Tahrirlash
        </Button>
      </div>
    </Card>
  );
}

/* ─── STATIC DATA ─── */

const EMAIL_TEMPLATES = [
  {
    id: "submission-received",
    name: "Ariza qabul qilindi",
    description: "Muallif yangi ariza yuborganda avtomatik yuboriladi.",
    subject: "Sizning arizangiz qabul qilindi — #{id}",
    status: "active",
    icon: CheckCircle,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    id: "review-assigned",
    name: "Taqrizchi tayinlandi",
    description: "Taqrizchiga yangi topshiriq berilganda yuboriladi.",
    subject: "Yangi taqriz topshirig'i — #{title}",
    status: "active",
    icon: Users,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "revision-required",
    name: "Tuzatish talab qilinadi",
    description: "Muallifga qayta ishlash kerakligi haqida xabar yuboriladi.",
    subject: "Ish tuzatishni talab qiladi — #{title}",
    status: "active",
    icon: AlertCircle,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    id: "accepted",
    name: "Qabul qilindi",
    description: "Ish nashrga qabul qilinganda muallifga xabar yuboriladi.",
    subject: "Tabriklaymiz! Ishingiz qabul qilindi — #{title}",
    status: "active",
    icon: CheckCircle,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    id: "rejected",
    name: "Rad etildi",
    description: "Ish rad etilganda muallifga sabab bilan xabar yuboriladi.",
    subject: "Arizangiz bo'yicha qaror — #{title}",
    status: "draft",
    icon: Shield,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    id: "published",
    name: "Nashr qilindi",
    description: "Ish rasman nashr qilinganda barcha stakeholderlarga xabar yuboriladi.",
    subject: "Ilmiy ish nashr qilindi — #{title}",
    status: "draft",
    icon: BookOpen,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
];

const MOCK_AUDIT_LOGS = [
  { action: "Foydalanuvchi roli o'zgartirildi", detail: "admin@uni.uz → Aziz Karimov roli: author → reviewer", user: "admin@uni.uz", time: "bugun 14:32", icon: Users, color: "bg-blue-100 text-blue-600" },
  { action: "Yangi ariza qabul qilindi", detail: "\"Python dasturlash asoslari\" (darslik) — Sarvar Toshmatov", user: "tizim", time: "bugun 12:15", icon: FileText, color: "bg-emerald-100 text-emerald-600" },
  { action: "Ariza rad etildi", detail: "\"Matematika 1\" — taqrizchi xulosasiga ko'ra", user: "editor@uni.uz", time: "bugun 11:48", icon: Shield, color: "bg-red-100 text-red-600" },
  { action: "Taqrizchi tayinlandi", detail: "Ariza #24 → Prof. Alisher Nazarov tayinlandi", user: "editor@uni.uz", time: "kecha 17:20", icon: Users, color: "bg-amber-100 text-amber-600" },
  { action: "Yangi kafedra qo'shildi", detail: "\"Sun'iy intellekt\" kafedrasi yaratildi", user: "admin@uni.uz", time: "kecha 10:05", icon: BookOpen, color: "bg-violet-100 text-violet-600" },
  { action: "Email shablon tahrirlandi", detail: "\"Qabul qilindi\" shabloni yangilandi", user: "admin@uni.uz", time: "kecha 09:30", icon: Mail, color: "bg-slate-100 text-slate-600" },
  { action: "Yangi foydalanuvchi ro'yxatdan o'tdi", detail: "Dilnoza Yusupova (author) — bio.dept@uni.uz", user: "tizim", time: "2 kun oldin", icon: Users, color: "bg-blue-100 text-blue-600" },
  { action: "Ish nashr qilindi", detail: "\"Kimyo asoslari\" monografiyasi nashr ro'yxatiga qo'shildi", user: "editor@uni.uz", time: "2 kun oldin", icon: CheckCircle, color: "bg-emerald-100 text-emerald-600" },
  { action: "Ilmiy yo'nalish o'chirildi", detail: "\"Eskirgan yo'nalish\" o'chirildi (foydalanuvchilar yo'q)", user: "admin@uni.uz", time: "3 kun oldin", icon: Activity, color: "bg-red-100 text-red-600" },
  { action: "Tizimga kirish", detail: "Muvaffaqiyatli login — IP: 185.22.xx.xx", user: "admin@uni.uz", time: "3 kun oldin", icon: Clock, color: "bg-slate-100 text-slate-500" },
];
