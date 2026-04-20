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
  useCreateAdminUser,
  useDeleteAdminUser,
  useResetUserPassword,
  useGetSubmissions,
  getGetAuditLogsQueryOptions,
  getGetEmailTemplatesQueryOptions,
} from "@workspace/api-client-react";
import { Card, PageTransition, LoadingSpinner, Badge, Select, Button, Input, Textarea } from "@/components/ui/shared";
import {
  Users, FileText, CheckCircle, Shield, Search, Trash2, Plus, Activity,
  BookOpen, Mail, Settings2, LayoutDashboard, Edit3, Save, ToggleLeft, ToggleRight,
  TrendingUp, UserCheck, Globe, RefreshCw, X, Download, FileSpreadsheet,
  PieChart as PieIcon, Lock, Eye, EyeOff, UserPlus, AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  cn,
  formatDate,
  getLocalizedLiteratureType,
  getLocalizedRoleLabel,
  getLocalizedStatusLabel,
  STATUS_COLORS,
} from "@/lib/utils";
import { Link } from "wouter";
import { updateExpertProfile } from "@/lib/experts";
import { useLocale } from "@/lib/i18n";

/* ── helpers ── */
function getSection(path: string) {
  const m = path.match(/^\/dashboard\/admin\/?([^/]*)$/);
  return m?.[1] || "overview";
}

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  admin:    { label: "Admin",     cls: "bg-red-50 text-red-700 border-red-200" },
  editor:   { label: "Ekspert",  cls: "bg-violet-50 text-violet-700 border-violet-200" },
  reviewer: { label: "Ekspert", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  publisher:{ label: "Noshir",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  author:   { label: "Muallif",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

const DEGREE_OPTIONS = [
  { value: "none", label: "Yo'q" },
  { value: "bachelor", label: "Bakalavr" },
  { value: "master", label: "Magistr" },
  { value: "phd", label: "PhD" },
  { value: "dsc", label: "Fan doktori (DSc)" },
  { value: "professor", label: "Professor" },
];

const POSITION_OPTIONS = [
  { value: "teacher", label: "O'qituvchi" },
  { value: "senior_teacher", label: "Katta o'qituvchi" },
  { value: "assistant", label: "Assistent" },
  { value: "associate_professor", label: "Dotsent" },
  { value: "professor", label: "Professor" },
  { value: "department_head", label: "Kafedra mudiri" },
  { value: "dean", label: "Dekan" },
];

const ACTION_META: Record<string, { icon: any; color: string; label: string }> = {
  user_login:                { icon: UserCheck,      color: "bg-blue-100 text-blue-700",     label: "Tizimga kirish" },
  user_logout:               { icon: X,              color: "bg-slate-100 text-slate-600",    label: "Tizimdan chiqish" },
  user_registered:           { icon: Users,          color: "bg-emerald-100 text-emerald-700",label: "Yangi foydalanuvchi" },
  user_deleted:              { icon: Trash2,         color: "bg-red-100 text-red-700",        label: "Foydalanuvchi o'chirildi" },
  role_changed:              { icon: Shield,         color: "bg-violet-100 text-violet-700",  label: "Rol o'zgartirildi" },
  password_reset:            { icon: Lock,           color: "bg-amber-100 text-amber-700",    label: "Parol tiklandi" },
  submission_created:        { icon: FileText,       color: "bg-blue-100 text-blue-700",      label: "Yangi ariza" },
  submission_status_changed: { icon: Activity,      color: "bg-amber-100 text-amber-700",    label: "Ariza holati" },
  expert_assigned:           { icon: UserCheck,      color: "bg-indigo-100 text-indigo-700",  label: "Ekspert tayinlandi" },
  email_template_updated:    { icon: Mail,           color: "bg-pink-100 text-pink-700",      label: "Shablon yangilandi" },
  export_users:              { icon: Download,       color: "bg-teal-100 text-teal-700",      label: "Export: foydalanuvchilar" },
  export_submissions:        { icon: Download,       color: "bg-teal-100 text-teal-700",      label: "Export: arizalar" },
  export_reviews:            { icon: Download,       color: "bg-teal-100 text-teal-700",      label: "Export: taqrizlar" },
  export_stats:              { icon: Download,       color: "bg-teal-100 text-teal-700",      label: "Export: statistika" },
};

/* ── Excel download helper (needs Authorization header) ── */
async function downloadExcel(url: string, filename: string, setLoading: (v: boolean) => void, toast: any) {
  setLoading(true);
  try {
    const token = localStorage.getItem("portal_token");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Server xatosi");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Yuklab olindi", description: `${filename} tayyor` });
  } catch {
    toast({ title: "Xatolik", description: "Yuklab olishda xatolik yuz berdi", variant: "destructive" });
  } finally {
    setLoading(false);
  }
}

/* ════════════════════════════════ COMPONENT ════════════════════════════════ */
export default function AdminDashboard() {
  const [location] = useLocation();
  const { locale, stripLocale, t, withLocale } = useLocale();
  const section = getSection(stripLocale(location));
  const qc = useQueryClient();
  const { toast } = useToast();

  /* ── Data ── */
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetAdminStats();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useGetUsers();
  const { data: submissionsData, isLoading: submissionsLoading, refetch: refetchSubmissions } = useGetSubmissions({ limit: 200 });
  const { data: departments } = useGetDepartments();
  const { data: departmentsFull, refetch: refetchDepts } = useGetDepartments();
  const { data: directions, refetch: refetchDirs } = useGetScientificDirections();
  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useQuery(
    getGetAuditLogsQueryOptions({ limit: 200 })
  );
  const { data: emailTemplates, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery(
    getGetEmailTemplatesQueryOptions()
  );

  /* ── Mutations ── */
  const updateRoleMutation    = useUpdateUserRole();
  const createUserMutation    = useCreateAdminUser();
  const deleteUserMutation    = useDeleteAdminUser();
  const resetPasswordMutation = useResetUserPassword();
  const createDeptMutation    = useCreateDepartment();
  const deleteDeptMutation    = useDeleteDepartment();
  const createDirMutation     = useCreateScientificDirection();
  const deleteDirMutation     = useDeleteScientificDirection();
  const updateTemplateMutation = useUpdateEmailTemplate();

  /* ── Local state: users tab ── */
  const [userSearch, setUserSearch]   = useState("");
  const [roleFilter, setRoleFilter]   = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPwd, setShowNewPwd]   = useState(false);
  const [editingExpert, setEditingExpert] = useState<any | null>(null);
  const [expertForm, setExpertForm] = useState({
    expertOrganization: "",
    expertBio: "",
    expertSpecialties: "",
    expertIsActive: true,
  });

  /* ── Local state: create user form ── */
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", role: "author",
    departmentId: "", scientificDegree: "none", position: "teacher",
  });
  const [showFormPwd, setShowFormPwd] = useState(false);

  /* ── Local state: dictionaries tab ── */
  const [newDeptName, setNewDeptName] = useState("");
  const [newDirName,  setNewDirName]  = useState("");

  /* ── Local state: email templates tab ── */
  const [editingTemplate,  setEditingTemplate]  = useState<number | null>(null);
  const [templateEdits,    setTemplateEdits]    = useState<{ subject: string; body: string } | null>(null);

  /* ── Local state: reports tab ── */
  const [downloading, setDownloading] = useState<string | null>(null);

  /* ═══ HANDLERS ═══ */
  async function handleRoleChange(id: number, role: string) {
    try {
      await updateRoleMutation.mutateAsync({ id, data: { role: role as any } });
      toast({ title: "Rol o'zgartirildi" });
      refetchUsers(); refetchStats();
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createUserMutation.mutateAsync({
        data: {
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role as any,
          departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
          scientificDegree: form.scientificDegree,
          position: form.position,
        },
      });
      toast({ title: "Foydalanuvchi yaratildi", description: `${form.email} tizimga qo'shildi` });
      setShowCreateModal(false);
      setForm({ fullName: "", email: "", password: "", role: "author", departmentId: "", scientificDegree: "none", position: "teacher" });
      refetchUsers(); refetchStats();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err?.message || "Yaratishda xatolik", variant: "destructive" });
    }
  }

  async function handleDeleteUser(id: number, name: string) {
    if (!confirm(`"${name}" foydalanuvchisini o'chirishni tasdiqlaysizmi?\n\nBu amalni bekor qilib bo'lmaydi!`)) return;
    try {
      await deleteUserMutation.mutateAsync({ id });
      toast({ title: "O'chirildi", description: `${name} tizimdan o'chirildi` });
      refetchUsers(); refetchStats();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err?.message || "O'chirishda xatolik", variant: "destructive" });
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      await resetPasswordMutation.mutateAsync({ id: resetTarget.id, data: { password: newPassword } });
      toast({ title: "Parol tiklandi", description: `${resetTarget.name} uchun yangi parol o'rnatildi` });
      setResetTarget(null);
      setNewPassword("");
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  }

  async function handleSaveExpertProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpert) return;
    try {
      await updateExpertProfile(editingExpert.id, {
        expertOrganization: expertForm.expertOrganization,
        expertBio: expertForm.expertBio,
        expertSpecialties: expertForm.expertSpecialties.split(",").map((item) => item.trim()).filter(Boolean),
        expertIsActive: expertForm.expertIsActive,
      });
      toast({ title: "Ekspert profili yangilandi" });
      setEditingExpert(null);
      refetchUsers();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err?.message || "Ekspert profilini saqlab bo'lmadi", variant: "destructive" });
    }
  }

  async function handleCreateDept(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await createDeptMutation.mutateAsync({ data: { name: newDeptName.trim() } });
      setNewDeptName(""); refetchDepts();
      toast({ title: "Kafedra qo'shildi" });
    } catch { toast({ title: "Xatolik", variant: "destructive" }); }
  }

  async function handleDeleteDept(id: number, name: string) {
    if (!confirm(`"${name}" kafedrini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await deleteDeptMutation.mutateAsync({ id }); refetchDepts();
      toast({ title: "O'chirildi" });
    } catch { toast({ title: "Xatolik", variant: "destructive" }); }
  }

  async function handleCreateDir(e: React.FormEvent) {
    e.preventDefault();
    if (!newDirName.trim()) return;
    try {
      await createDirMutation.mutateAsync({ data: { name: newDirName.trim() } });
      setNewDirName(""); refetchDirs();
      toast({ title: "Yo'nalish qo'shildi" });
    } catch { toast({ title: "Xatolik", variant: "destructive" }); }
  }

  async function handleDeleteDir(id: number, name: string) {
    if (!confirm(`"${name}" yo'nalishini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await deleteDirMutation.mutateAsync({ id }); refetchDirs();
      toast({ title: "O'chirildi" });
    } catch { toast({ title: "Xatolik", variant: "destructive" }); }
  }

  function startEditTemplate(tpl: any) {
    setEditingTemplate(tpl.id);
    setTemplateEdits({ subject: tpl.subject, body: tpl.body });
  }

  async function saveTemplate(id: number) {
    if (!templateEdits) return;
    try {
      await updateTemplateMutation.mutateAsync({ id, data: templateEdits });
      setEditingTemplate(null); refetchTemplates();
      toast({ title: "Shablon saqlandi" });
    } catch { toast({ title: "Xatolik", variant: "destructive" }); }
  }

  async function toggleTemplate(id: number, isActive: boolean) {
    try {
      await updateTemplateMutation.mutateAsync({ id, data: { isActive: !isActive } });
      refetchTemplates();
      toast({ title: isActive ? "O'chirildi" : "Yoqildi" });
    } catch { toast({ title: "Xatolik", variant: "destructive" }); }
  }

  /* ── Derived data ── */
  const filteredUsers = (users ?? []).filter(u => {
    const matchSearch =
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole =
      roleFilter === "all" ||
      (roleFilter === "experts" ? u.role === "reviewer" || u.role === "editor" : u.role === roleFilter);
    return matchSearch && matchRole;
  });
  const expertUsers = (users ?? []).filter((user: any) => user.role === "reviewer" || user.role === "editor");
  const expertRoleCount = ((stats as any)?.totalExperts ?? 0) || ((stats?.totalReviewers ?? 0) + (stats?.totalEditors ?? 0));

  const barData = [
    { name: t({ uz: "Yuborilgan", en: "Submitted", ru: "Отправлено" }), cnt: stats?.submissionsByStatus?.submitted         ?? 0, fill: "#3b82f6" },
    { name: t({ uz: "Taqrizda", en: "In review", ru: "На рецензии" }),   cnt: stats?.submissionsByStatus?.under_review       ?? 0, fill: "#f59e0b" },
    { name: t({ uz: "Tuzatish", en: "Revision", ru: "Доработка" }),   cnt: stats?.submissionsByStatus?.revision_required  ?? 0, fill: "#f97316" },
    { name: t({ uz: "Qabul", en: "Accepted", ru: "Принято" }),      cnt: stats?.submissionsByStatus?.accepted            ?? 0, fill: "#10b981" },
    { name: t({ uz: "Rad", en: "Rejected", ru: "Отклонено" }),        cnt: stats?.submissionsByStatus?.rejected            ?? 0, fill: "#ef4444" },
    { name: t({ uz: "Nashr", en: "Published", ru: "Опубликовано" }),      cnt: stats?.submissionsByStatus?.published           ?? 0, fill: "#8b5cf6" },
  ];

  const userRoleStats = [
    { name: t({ uz: "Mualliflar", en: "Authors", ru: "Авторы" }),   value: stats?.totalAuthors   ?? 0, fill: "#3b82f6" },
    { name: t({ uz: "Ekspertlar", en: "Experts", ru: "Эксперты" }), value: expertRoleCount, fill: "#f59e0b" },
    { name: t({ uz: "Noshirlar", en: "Publishers", ru: "Издатели" }),    value: (stats as any)?.totalPublishers ?? 0, fill: "#10b981" },
    { name: t({ uz: "Adminlar", en: "Administrators", ru: "Администраторы" }),     value: stats?.totalAdmins    ?? 0, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  const apiBase = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const getDegreeLabel = (value: string) =>
    ({
      none: t({ uz: "Yo'q", en: "None", ru: "Нет" }),
      bachelor: t({ uz: "Bakalavr", en: "Bachelor", ru: "Бакалавр" }),
      master: t({ uz: "Magistr", en: "Master", ru: "Магистр" }),
      phd: "PhD",
      dsc: t({ uz: "Fan doktori (DSc)", en: "Doctor of Science (DSc)", ru: "Доктор наук (DSc)" }),
      professor: t({ uz: "Professor", en: "Professor", ru: "Профессор" }),
    })[value] ?? value;
  const getPositionLabel = (value: string) =>
    ({
      teacher: t({ uz: "O'qituvchi", en: "Teacher", ru: "Преподаватель" }),
      senior_teacher: t({ uz: "Katta o'qituvchi", en: "Senior teacher", ru: "Старший преподаватель" }),
      assistant: t({ uz: "Assistent", en: "Assistant", ru: "Ассистент" }),
      associate_professor: t({ uz: "Dotsent", en: "Associate professor", ru: "Доцент" }),
      professor: t({ uz: "Professor", en: "Professor", ru: "Профессор" }),
      department_head: t({ uz: "Kafedra mudiri", en: "Department head", ru: "Заведующий кафедрой" }),
      dean: t({ uz: "Dekan", en: "Dean", ru: "Декан" }),
    })[value] ?? value;
  const getActionLabel = (action: string) =>
    ({
      user_login: t({ uz: "Tizimga kirish", en: "Sign in", ru: "Вход в систему" }),
      user_logout: t({ uz: "Tizimdan chiqish", en: "Sign out", ru: "Выход из системы" }),
      user_registered: t({ uz: "Yangi foydalanuvchi", en: "New user", ru: "Новый пользователь" }),
      user_deleted: t({ uz: "Foydalanuvchi o'chirildi", en: "User deleted", ru: "Пользователь удален" }),
      role_changed: t({ uz: "Rol o'zgartirildi", en: "Role changed", ru: "Роль изменена" }),
      password_reset: t({ uz: "Parol tiklandi", en: "Password reset", ru: "Пароль сброшен" }),
      submission_created: t({ uz: "Yangi ariza", en: "New submission", ru: "Новая заявка" }),
      submission_status_changed: t({ uz: "Ariza holati", en: "Submission status", ru: "Статус заявки" }),
      expert_assigned: t({ uz: "Ekspert tayinlandi", en: "Expert assigned", ru: "Эксперт назначен" }),
      email_template_updated: t({ uz: "Shablon yangilandi", en: "Template updated", ru: "Шаблон обновлен" }),
      export_users: t({ uz: "Export: foydalanuvchilar", en: "Export: users", ru: "Экспорт: пользователи" }),
      export_submissions: t({ uz: "Export: arizalar", en: "Export: submissions", ru: "Экспорт: заявки" }),
      export_reviews: t({ uz: "Export: taqrizlar", en: "Export: reviews", ru: "Экспорт: рецензии" }),
      export_stats: t({ uz: "Export: statistika", en: "Export: statistics", ru: "Экспорт: статистика" }),
    })[action] ?? action;
  const formatAuditDetail = (detail: string | null | undefined) =>
    detail
      ?.replace(/\beditor\b/gi, t({ uz: "ekspert", en: "expert", ru: "эксперт" }))
      .replace(/\breviewer\b/gi, t({ uz: "ekspert", en: "expert", ru: "эксперт" }))
      .replace(/\bMuharrir\b/g, t({ uz: "Ekspert", en: "Expert", ru: "Эксперт" }))
      .replace(/\bTaqrizchi\b/g, t({ uz: "Ekspert", en: "Expert", ru: "Эксперт" }))
      .replace(/\bРедактор\b/g, t({ uz: "Ekspert", en: "Expert", ru: "Эксперт" }))
      .replace(/\bРецензент\b/g, t({ uz: "Ekspert", en: "Expert", ru: "Эксперт" }));

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <DashboardLayout>
      <PageTransition>
        {/* ─── Page Header ─── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-bold text-primary">
              {section === "overview"        && t({ uz: "Statistika", en: "Statistics", ru: "Статистика" })}
              {section === "submissions"     && t({ uz: "Ilmiy ishlar", en: "Scientific works", ru: "Научные работы" })}
              {section === "users"           && t({ uz: "Foydalanuvchilar", en: "Users", ru: "Пользователи" })}
              {section === "experts"         && t({ uz: "Ekspertlar ro'yxati", en: "Experts list", ru: "Список экспертов" })}
              {section === "dictionaries"    && t({ uz: "Lug'at sozlamalari", en: "Dictionaries", ru: "Справочники" })}
              {section === "email-templates" && t({ uz: "Email shablonlari", en: "Email templates", ru: "Почтовые шаблоны" })}
              {section === "reports"         && t({ uz: "Excel hisobotlar", en: "Excel reports", ru: "Excel-отчеты" })}
              {section === "logs"            && t({ uz: "Audit loglari", en: "Audit logs", ru: "Журнал аудита" })}
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {section === "overview"        && t({ uz: "Tizimning umumiy holati va faoliyat statistikasi", en: "Overall system health and activity statistics", ru: "Общее состояние системы и статистика активности" })}
              {section === "submissions"     && t({ uz: "Mualliflar yuborgan ilmiy ishlarni ko'rish va jarayon boshqaruviga o'tish", en: "Review submitted works and move into workflow management", ru: "Просмотр отправленных работ и переход к управлению процессом" })}
              {section === "users"           && t({ uz: "Foydalanuvchilarni qo'shish, o'chirish, rollarni sozlash", en: "Create, delete, and manage user roles", ru: "Создание, удаление и настройка ролей пользователей" })}
              {section === "experts"         && t({ uz: "Ekspertlar bazasini yuritish, faollashtirish va profil ma'lumotlarini yangilash", en: "Maintain expert records, activation, and profile information", ru: "Ведение базы экспертов, активация и обновление профилей" })}
              {section === "dictionaries"    && t({ uz: "Kafedralar va ilmiy yo'nalishlar ro'yxatini boshqarish", en: "Manage departments and scientific directions", ru: "Управление кафедрами и научными направлениями" })}
              {section === "email-templates" && t({ uz: "Avtomatik yuboriluvchi email xabarlarini sozlash", en: "Configure automatic email notifications", ru: "Настройка автоматических email-уведомлений" })}
              {section === "reports"         && t({ uz: "Barcha ma'lumotlarni Excel formatida yuklab olish", en: "Download all data in Excel format", ru: "Выгрузка всех данных в формате Excel" })}
              {section === "logs"            && t({ uz: "Tizimda amalga oshirilgan barcha harakatlar tarixi", en: "History of all actions performed in the system", ru: "История всех действий, выполненных в системе" })}
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
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  <KpiCard label={t({ uz: "Jami foydalanuvchilar", en: "Total users", ru: "Всего пользователей" })} value={stats?.totalUsers ?? 0}        icon={Users}       accent="blue"    />
                  <KpiCard label={t({ uz: "Ekspertlar", en: "Experts", ru: "Эксперты" })}           value={expertRoleCount}    icon={Shield}      accent="violet"  />
                  <KpiCard label={t({ uz: "Jami arizalar", en: "Total submissions", ru: "Всего заявок" })}          value={stats?.totalSubmissions ?? 0}  icon={FileText}    accent="amber"   />
                  <KpiCard label={t({ uz: "Nashr qilingan", en: "Published", ru: "Опубликовано" })}         value={stats?.published ?? 0}          icon={CheckCircle} accent="emerald" />
                </div>

                <div className="grid lg:grid-cols-5 gap-5">
                  <Card className="lg:col-span-3 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold font-serif text-slate-800">
                        {t({ uz: "Arizalar holati bo'yicha", en: "Submissions by status", ru: "Заявки по статусам" })}
                      </h3>
                      <button onClick={() => refetchStats()} className="text-muted-foreground hover:text-primary transition-colors">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                    {barData.every(d => d.cnt === 0) ? (
                      <div className="h-[240px] flex flex-col items-center justify-center">
                        <TrendingUp className="h-12 w-12 mb-3 text-slate-200" />
                        <p className="text-sm text-slate-400">{t({ uz: "Ma'lumot yo'q", en: "No data", ru: "Нет данных" })}</p>
                      </div>
                    ) : (
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                            <Bar dataKey="cnt" name={t({ uz: "Arizalar", en: "Submissions", ru: "Заявки" })} radius={[4, 4, 0, 0]} maxBarSize={40}>
                              {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Card>

                  <Card className="lg:col-span-2 p-6">
                    <h3 className="font-bold font-serif text-slate-800 mb-5">
                      {t({ uz: "Foydalanuvchilar roli", en: "User roles", ru: "Роли пользователей" })}
                    </h3>
                    {userRoleStats.length === 0 ? (
                      <div className="h-[240px] flex flex-col items-center justify-center">
                        <PieIcon className="h-12 w-12 mb-3 text-slate-200" />
                        <p className="text-sm text-slate-400">{t({ uz: "Ma'lumot yo'q", en: "No data", ru: "Нет данных" })}</p>
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: t({ uz: "Yangi arizalar", en: "New submissions", ru: "Новые заявки" }),    value: stats?.submissionsByStatus?.submitted ?? 0,         color: "text-blue-600",    bg: "bg-blue-50" },
                    { label: t({ uz: "Taqriz jarayonida", en: "In review", ru: "В рецензировании" }), value: stats?.submissionsByStatus?.under_review ?? 0,      color: "text-amber-600",   bg: "bg-amber-50" },
                    { label: t({ uz: "Tuzatish kerak", en: "Revision required", ru: "Требуется доработка" }),    value: stats?.submissionsByStatus?.revision_required ?? 0, color: "text-orange-600",  bg: "bg-orange-50" },
                    { label: t({ uz: "Qabul qilingan", en: "Accepted", ru: "Принято" }),    value: stats?.submissionsByStatus?.accepted ?? 0,          color: "text-emerald-600", bg: "bg-emerald-50" },
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
        {section === "submissions" && (
          <div className="animate-in fade-in-0 duration-200 space-y-4">
            <Card className="overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border bg-white flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold font-serif text-slate-800">
                    {t({ uz: "Yuborilgan ilmiy ishlar", en: "Submitted scientific works", ru: "Отправленные научные работы" })}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t({
                      uz: "Yangi arizalar bu yerda ko'rinadi. Ekspert tayinlash va qaror qabul qilish uchun admin sifatida ekspert jarayoniga ham o'tishingiz mumkin.",
                      en: "New submissions appear here. As admin, you can also open the expert workflow to assign experts and make decisions.",
                      ru: "Новые заявки отображаются здесь. Администратор также может перейти к экспертному процессу для назначения экспертов и принятия решений.",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => { refetchSubmissions(); refetchStats(); }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t({ uz: "Yangilash", en: "Refresh", ru: "Обновить" })}
                  </Button>
                  <Link href={withLocale("/dashboard/editor")}>
                    <Button size="sm" className="h-8 text-xs gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      {t({ uz: "Jarayonni boshqarish", en: "Manage workflow", ru: "Управлять процессом" })}
                    </Button>
                  </Link>
                </div>
              </div>

              {submissionsLoading ? (
                <div className="flex justify-center py-16"><LoadingSpinner /></div>
              ) : !(submissionsData?.items?.length) ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  {t({ uz: "Hali ilmiy ishlar yuborilmagan.", en: "No scientific works have been submitted yet.", ru: "Научные работы пока не отправлены." })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-b border-border/70">
                      <tr>
                        <th className="px-5 py-3 font-semibold">{t({ uz: "Sarlavha", en: "Title", ru: "Название" })}</th>
                        <th className="px-5 py-3 font-semibold hidden lg:table-cell">{t({ uz: "Muallif", en: "Author", ru: "Автор" })}</th>
                        <th className="px-5 py-3 font-semibold">{t({ uz: "Turi", en: "Type", ru: "Тип" })}</th>
                        <th className="px-5 py-3 font-semibold">{t({ uz: "Holati", en: "Status", ru: "Статус" })}</th>
                        <th className="px-5 py-3 font-semibold hidden md:table-cell">{t({ uz: "Sana", en: "Date", ru: "Дата" })}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {submissionsData.items.map((submission: any, idx: number) => (
                        <tr key={submission.id} className={cn("hover:bg-slate-50/60 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/20")}>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-800">{submission.title}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {submission.scientificDirection || t({ uz: "Yo'nalish ko'rsatilmagan", en: "Direction not specified", ru: "Направление не указано" })}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 hidden lg:table-cell text-slate-600">
                            {submission.authorName || t({ uz: "Noma'lum", en: "Unknown", ru: "Неизвестно" })}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {getLocalizedLiteratureType(submission.literatureType, locale)}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge className={cn("rounded-full px-3 py-0.5 border", STATUS_COLORS[submission.status as keyof typeof STATUS_COLORS])}>
                              {getLocalizedStatusLabel(submission.status, locale)}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell text-slate-400">{formatDate(submission.createdAt, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {section === "experts" && (
          <div className="animate-in fade-in-0 duration-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                {t({
                  uz: "Admin bu yerda ekspert akkauntlarini faollashtiradi, profilini to'ldiradi va kerak bo'lsa o'chiradi.",
                  en: "Admins can activate expert accounts, complete profiles, and remove experts when needed.",
                  ru: "Администратор может активировать аккаунты экспертов, заполнять профили и удалять экспертов при необходимости.",
                })}
              </div>
              <Button
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => {
                  setForm({ fullName: "", email: "", password: "", role: "expert", departmentId: "", scientificDegree: "none", position: "teacher" });
                  setShowFormPwd(false);
                  setShowCreateModal(true);
                }}
              >
                <UserPlus className="h-4 w-4" />
                {t({ uz: "Ekspert qo'shish", en: "Add expert", ru: "Добавить эксперта" })}
              </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {expertUsers.map((expert: any) => (
                <Card key={expert.id} className="p-5 border border-border shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{expert.fullName}</h3>
                      <p className="text-sm text-slate-500">{expert.email}</p>
                    </div>
                    <Badge className={expert.expertIsActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}>
                      {expert.expertIsActive
                        ? t({ uz: "Faol", en: "Active", ru: "Активен" })
                        : t({ uz: "Nofaol", en: "Inactive", ru: "Неактивен" })}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-800">{t({ uz: "Tashkilot", en: "Organization", ru: "Организация" })}:</span> {expert.expertOrganization || expert.departmentName || t({ uz: "Kiritilmagan", en: "Not provided", ru: "Не указано" })}</p>
                    <p><span className="font-semibold text-slate-800">{t({ uz: "Mutaxassisliklar", en: "Specialties", ru: "Специализации" })}:</span> {(expert.expertSpecialties || []).join(", ") || t({ uz: "Kiritilmagan", en: "Not provided", ru: "Не указано" })}</p>
                    <p className="line-clamp-3"><span className="font-semibold text-slate-800">Bio:</span> {expert.expertBio || t({ uz: "Kiritilmagan", en: "Not provided", ru: "Не указано" })}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingExpert(expert);
                        setExpertForm({
                          expertOrganization: expert.expertOrganization || "",
                          expertBio: expert.expertBio || "",
                          expertSpecialties: (expert.expertSpecialties || []).join(", "),
                          expertIsActive: Boolean(expert.expertIsActive),
                        });
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {t({ uz: "Profilni tahrirlash", en: "Edit profile", ru: "Редактировать профиль" })}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(expert.id, expert.fullName)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t({ uz: "O'chirish", en: "Delete", ru: "Удалить" })}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {showCreateModal && form.role === "expert" && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <Card className="w-full max-w-lg shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
                  <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold font-serif text-lg text-slate-900 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      {t({ uz: "Yangi ekspert yaratish", en: "Create new expert", ru: "Создать нового эксперта" })}
                    </h3>
                    <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                        {t({ uz: "To'liq ismi", en: "Full name", ru: "ФИО" })} *
                      </label>
                      <Input
                        placeholder={t({ uz: "Karimov Jasur Aliyevich", en: "John Smith", ru: "Иванов Иван Иванович" })}
                        value={form.fullName}
                        onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email *</label>
                      <Input
                        type="email"
                        placeholder="expert@uni.uz"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                        {t({ uz: "Parol", en: "Password", ru: "Пароль" })} *
                      </label>
                      <div className="relative">
                        <Input
                          type={showFormPwd ? "text" : "password"}
                          placeholder={t({ uz: "Kamida 6 belgi", en: "At least 6 characters", ru: "Минимум 6 символов" })}
                          value={form.password}
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                          className="pr-10"
                          minLength={6}
                          required
                        />
                        <button type="button" onClick={() => setShowFormPwd(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showFormPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                        {t({ uz: "Kafedra", en: "Department", ru: "Кафедра" })}
                      </label>
                      <Select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} className="h-9 text-sm">
                        <option value="">{t({ uz: "Tanlang", en: "Select", ru: "Выберите" })}</option>
                        {(departments ?? []).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </Select>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t({
                        uz: "Ekspert faol holatda yaratiladi. Keyin profil, tashkilot va mutaxassisliklarini shu bo'limda tahrirlashingiz mumkin.",
                        en: "The expert will be created as active. You can edit the profile, organization, and specialties in this section afterwards.",
                        ru: "Эксперт будет создан активным. Затем в этом разделе можно заполнить профиль, организацию и специализации.",
                      })}
                    </p>
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                        {t({ uz: "Bekor qilish", en: "Cancel", ru: "Отмена" })}
                      </Button>
                      <Button type="submit" className="flex-1" disabled={createUserMutation.isPending}>
                        {createUserMutation.isPending
                          ? t({ uz: "Yaratilmoqda...", en: "Creating...", ru: "Создание..." })
                          : t({ uz: "Ekspert yaratish", en: "Create expert", ru: "Создать эксперта" })}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {editingExpert && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <Card className="w-full max-w-2xl shadow-2xl">
                  <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold font-serif text-lg text-slate-900">
                      {t({ uz: "Ekspert profilini tahrirlash", en: "Edit expert profile", ru: "Редактировать профиль эксперта" })}
                    </h3>
                    <button onClick={() => setEditingExpert(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form onSubmit={handleSaveExpertProfile} className="p-6 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">{t({ uz: "Tashkilot", en: "Organization", ru: "Организация" })}</label>
                      <Input value={expertForm.expertOrganization} onChange={(e) => setExpertForm((current) => ({ ...current, expertOrganization: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">{t({ uz: "Mutaxassisliklar", en: "Specialties", ru: "Специализации" })}</label>
                      <Input value={expertForm.expertSpecialties} onChange={(e) => setExpertForm((current) => ({ ...current, expertSpecialties: e.target.value }))} placeholder={t({ uz: "Masalan: Pedagogika, Filologiya", en: "Example: Pedagogy, Philology", ru: "Например: педагогика, филология" })} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1.5">{t({ uz: "Qisqa bio", en: "Short bio", ru: "Краткая биография" })}</label>
                      <Textarea value={expertForm.expertBio} onChange={(e) => setExpertForm((current) => ({ ...current, expertBio: e.target.value }))} className="min-h-[120px]" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={expertForm.expertIsActive} onChange={(e) => setExpertForm((current) => ({ ...current, expertIsActive: e.target.checked }))} />
                      {t({ uz: "Portal ekspertlari ro'yxatida faol ko'rsatilsin", en: "Show as active in the portal experts list", ru: "Показывать активным в списке экспертов портала" })}
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="ghost" onClick={() => setEditingExpert(null)}>
                        {t({ uz: "Bekor qilish", en: "Cancel", ru: "Отмена" })}
                      </Button>
                      <Button type="submit">{t({ uz: "Saqlash", en: "Save", ru: "Сохранить" })}</Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}
          </div>
        )}

        {section === "users" && (
          <div className="animate-in fade-in-0 duration-200 space-y-4">
            {/* Role filter chips + Add button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all",      label: `${t({ uz: "Barchasi", en: "All", ru: "Все" })} (${users?.length ?? 0})` },
                  { key: "author",   label: `${t({ uz: "Mualliflar", en: "Authors", ru: "Авторы" })} (${users?.filter(u=>u.role==="author").length ?? 0})` },
                  { key: "experts", label: `${t({ uz: "Ekspertlar", en: "Experts", ru: "Эксперты" })} (${users?.filter(u=>u.role==="reviewer" || u.role==="editor").length ?? 0})` },
                  { key: "publisher",label: `${t({ uz: "Noshirlar", en: "Publishers", ru: "Издатели" })} (${users?.filter((u: any)=>u.role==="publisher").length ?? 0})` },
                  { key: "admin",    label: `${t({ uz: "Adminlar", en: "Administrators", ru: "Администраторы" })} (${users?.filter(u=>u.role==="admin").length ?? 0})` },
                ].map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => setRoleFilter(chip.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                      chip.key === "all" && "bg-slate-100 text-slate-700 border-slate-200",
                      chip.key === "author" && "bg-blue-50 text-blue-700 border-blue-200",
                      chip.key === "experts" && "bg-amber-50 text-amber-700 border-amber-200",
                      chip.key === "publisher" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                      chip.key === "admin" && "bg-red-50 text-red-700 border-red-200",
                      roleFilter === chip.key ? "ring-2 ring-offset-1 ring-primary/40 shadow-sm" : "opacity-75 hover:opacity-100"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => {
                  setForm({ fullName: "", email: "", password: "", role: "author", departmentId: "", scientificDegree: "none", position: "teacher" });
                  setShowFormPwd(false);
                  setShowCreateModal(true);
                }}
              >
                <UserPlus className="h-4 w-4" />
                {t({ uz: "Foydalanuvchi qo'shish", en: "Add user", ru: "Добавить пользователя" })}
              </Button>
            </div>

            <Card className="overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold font-serif text-slate-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  {t({ uz: "Foydalanuvchilar", en: "Users", ru: "Пользователи" })}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({filteredUsers.length} {t({ uz: "ta", en: "items", ru: "зап." })})
                  </span>
                </h3>
                <div className="relative w-full sm:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t({ uz: "Ism yoki email...", en: "Name or email...", ru: "Имя или email..." })}
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
                      <th className="px-5 py-3 font-semibold">{t({ uz: "F.I.Sh / Email", en: "Full name / Email", ru: "Ф.И.О. / Email" })}</th>
                      <th className="px-5 py-3 font-semibold hidden lg:table-cell">{t({ uz: "Kafedra", en: "Department", ru: "Кафедра" })}</th>
                      <th className="px-5 py-3 font-semibold">{t({ uz: "Rol", en: "Role", ru: "Роль" })}</th>
                      <th className="px-5 py-3 font-semibold hidden md:table-cell">{t({ uz: "Sana", en: "Date", ru: "Дата" })}</th>
                      <th className="px-5 py-3 font-semibold text-right">{t({ uz: "Amallar", en: "Actions", ru: "Действия" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {usersLoading ? (
                      <tr><td colSpan={6} className="p-10 text-center"><LoadingSpinner /></td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={6} className="p-10 text-center text-slate-400 text-sm">{t({ uz: "Foydalanuvchilar topilmadi", en: "No users found", ru: "Пользователи не найдены" })}</td></tr>
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
                              <p className="text-[11px] text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-sm hidden lg:table-cell">
                          {user.departmentName || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <Select
                            className="h-8 text-xs bg-white border-border w-32"
                            value={user.role === "reviewer" || user.role === "editor" ? "expert" : user.role}
                            onChange={e => handleRoleChange(user.id, e.target.value)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <option value="author">{getLocalizedRoleLabel("author", locale)}</option>
                            <option value="expert">{getLocalizedRoleLabel("reviewer", locale)}</option>
                            <option value="publisher">{getLocalizedRoleLabel("publisher", locale)}</option>
                            <option value="admin">{getLocalizedRoleLabel("admin", locale)}</option>
                          </Select>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs hidden md:table-cell">
                          {formatDate(user.createdAt, locale)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setResetTarget({ id: user.id, name: user.fullName }); setNewPassword(""); }}
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                              title={t({ uz: "Parolni tiklash", en: "Reset password", ru: "Сбросить пароль" })}
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.fullName)}
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              title={t({ uz: "O'chirish", en: "Delete", ru: "Удалить" })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ─── Create User Modal ─── */}
            {showCreateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <Card className="w-full max-w-lg shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
                  <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold font-serif text-lg text-slate-900 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      {t({ uz: "Yangi foydalanuvchi yaratish", en: "Create new user", ru: "Создать пользователя" })}
                    </h3>
                    <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                          {t({ uz: "To'liq ismi", en: "Full name", ru: "ФИО" })} *
                        </label>
                        <Input
                          placeholder={t({ uz: "Karimov Jasur Aliyevich", en: "John Smith", ru: "Иванов Иван Иванович" })}
                          value={form.fullName}
                          onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email *</label>
                        <Input
                          type="email"
                          placeholder="jasur@uni.uz"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                          {t({ uz: "Parol", en: "Password", ru: "Пароль" })} *
                        </label>
                        <div className="relative">
                          <Input
                            type={showFormPwd ? "text" : "password"}
                            placeholder={t({ uz: "Kamida 6 belgi", en: "At least 6 characters", ru: "Минимум 6 символов" })}
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            className="pr-10"
                            minLength={6}
                            required
                          />
                          <button type="button" onClick={() => setShowFormPwd(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showFormPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">{t({ uz: "Roli", en: "Role", ru: "Роль" })}</label>
                        <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="h-9 text-sm">
                          <option value="author">{getLocalizedRoleLabel("author", locale)}</option>
                          <option value="expert">{getLocalizedRoleLabel("reviewer", locale)}</option>
                          <option value="publisher">{getLocalizedRoleLabel("publisher", locale)}</option>
                          <option value="admin">{getLocalizedRoleLabel("admin", locale)}</option>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">{t({ uz: "Kafedra", en: "Department", ru: "Кафедра" })}</label>
                        <Select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} className="h-9 text-sm">
                          <option value="">{t({ uz: "Tanlang", en: "Select", ru: "Выберите" })}</option>
                          {(departments ?? []).map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">{t({ uz: "Ilmiy daraja", en: "Scientific degree", ru: "Ученая степень" })}</label>
                        <Select value={form.scientificDegree} onChange={e => setForm(f => ({ ...f, scientificDegree: e.target.value }))} className="h-9 text-sm">
                          {DEGREE_OPTIONS.map(o => <option key={o.value} value={o.value}>{getDegreeLabel(o.value)}</option>)}
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">{t({ uz: "Lavozim", en: "Position", ru: "Должность" })}</label>
                        <Select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="h-9 text-sm">
                          {POSITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{getPositionLabel(o.value)}</option>)}
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                        {t({ uz: "Bekor qilish", en: "Cancel", ru: "Отмена" })}
                      </Button>
                      <Button type="submit" className="flex-1" disabled={createUserMutation.isPending}>
                        {createUserMutation.isPending
                          ? t({ uz: "Yaratilmoqda...", en: "Creating...", ru: "Создание..." })
                          : t({ uz: "Yaratish", en: "Create", ru: "Создать" })}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* ─── Reset Password Modal ─── */}
            {resetTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <Card className="w-full max-w-sm shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
                  <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold font-serif text-slate-900 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-600" />
                      {t({ uz: "Parolni tiklash", en: "Reset password", ru: "Сброс пароля" })}
                    </h3>
                    <button onClick={() => setResetTarget(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                    <p className="text-sm text-slate-600">
                      {t({ uz: "Yangi parol belgilang", en: "Set a new password for", ru: "Установите новый пароль для" })}{" "}
                      <span className="font-semibold text-slate-900">{resetTarget.name}</span>
                    </p>
                    <div className="relative">
                      <Input
                        type={showNewPwd ? "text" : "password"}
                        placeholder={t({ uz: "Yangi parol (kamida 6 belgi)", en: "New password (at least 6 characters)", ru: "Новый пароль (минимум 6 символов)" })}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="pr-10"
                        minLength={6}
                        required
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowNewPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        {t({ uz: "Foydalanuvchiga yangi parolni shaxsan xabardor qiling.", en: "Notify the user of the new password directly.", ru: "Сообщите пользователю новый пароль лично." })}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setResetTarget(null)}>
                        {t({ uz: "Bekor", en: "Cancel", ru: "Отмена" })}
                      </Button>
                      <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={resetPasswordMutation.isPending}>
                        {resetPasswordMutation.isPending
                          ? t({ uz: "Saqlanmoqda...", en: "Saving...", ru: "Сохранение..." })
                          : t({ uz: "Parolni o'rnatish", en: "Set password", ru: "Установить пароль" })}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ══════════ DICTIONARY SETTINGS ══════════ */}
        {section === "dictionaries" && (
          <div className="animate-in fade-in-0 duration-200 grid md:grid-cols-2 gap-5">
            <DictPanel
              title={t({ uz: "Kafedralar", en: "Departments", ru: "Кафедры" })} icon={Globe} count={departmentsFull?.length ?? 0}
              inputValue={newDeptName} onInputChange={setNewDeptName}
              onAdd={handleCreateDept} adding={createDeptMutation.isPending}
              placeholder={t({ uz: "Yangi kafedra nomi...", en: "New department name...", ru: "Название новой кафедры..." })}
              addLabel={t({ uz: "Qo'shish", en: "Add", ru: "Добавить" })}
              emptyLabel={t({ uz: "Ro'yxat bo'sh", en: "The list is empty", ru: "Список пуст" })}
            >
              {(departmentsFull ?? []).map(d => (
                <DictRow key={d.id} name={d.name} onDelete={() => handleDeleteDept(d.id, d.name)} />
              ))}
            </DictPanel>

            <DictPanel
              title={t({ uz: "Ilmiy yo'nalishlar", en: "Scientific directions", ru: "Научные направления" })} icon={BookOpen} count={directions?.length ?? 0}
              inputValue={newDirName} onInputChange={setNewDirName}
              onAdd={handleCreateDir} adding={createDirMutation.isPending}
              placeholder={t({ uz: "Yangi yo'nalish nomi...", en: "New direction name...", ru: "Название нового направления..." })}
              addLabel={t({ uz: "Qo'shish", en: "Add", ru: "Добавить" })}
              emptyLabel={t({ uz: "Ro'yxat bo'sh", en: "The list is empty", ru: "Список пуст" })}
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
                <p className="text-sm font-semibold text-amber-800">
                  {t({ uz: "SMTP integratsiyasi", en: "SMTP integration", ru: "SMTP-интеграция" })}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {t({
                    uz: "Shablonlarni tahrirlash va yoqish/o'chirish mumkin. SMTP orqali real yuborish keyingi versiyada.",
                    en: "Templates can be edited and enabled or disabled. Real SMTP delivery is planned for the next version.",
                    ru: "Шаблоны можно редактировать, включать и отключать. Реальная отправка через SMTP запланирована в следующей версии.",
                  })}
                </p>
              </div>
            </div>

            {templatesLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner /></div>
            ) : (
              <div className="space-y-3">
                {(emailTemplates ?? []).map((tpl: any) => (
                  <Card key={tpl.id} className="overflow-hidden shadow-sm">
                    {editingTemplate === tpl.id ? (
                      <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-primary" />
                            {tpl.name} - {t({ uz: "tahrirlash", en: "edit", ru: "редактирование" })}
                          </h4>
                          <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">
                            {t({ uz: "Mavzu", en: "Subject", ru: "Тема" })} (Subject)
                          </label>
                          <Input value={templateEdits?.subject ?? ""} onChange={e => setTemplateEdits(t => t ? { ...t, subject: e.target.value } : t)} className="h-9 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">
                            {t({ uz: "Xabar matni", en: "Message body", ru: "Текст сообщения" })} - {t({ uz: "o'zgaruvchilar", en: "variables", ru: "переменные" })}: #{"{"}fullName{"}"}, #{"{"}title{"}"}, #{"{"}id{"}"}, #{"{"}date{"}"}
                          </label>
                          <textarea
                            value={templateEdits?.body ?? ""}
                            onChange={e => setTemplateEdits(t => t ? { ...t, body: e.target.value } : t)}
                            rows={8}
                            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>
                            {t({ uz: "Bekor qilish", en: "Cancel", ru: "Отмена" })}
                          </Button>
                          <Button size="sm" onClick={() => saveTemplate(tpl.id)} disabled={updateTemplateMutation.isPending}>
                            <Save className="h-3.5 w-3.5 mr-1.5" />{t({ uz: "Saqlash", en: "Save", ru: "Сохранить" })}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-2">
                              <Mail className={cn("h-4 w-4 shrink-0", tpl.isActive ? "text-emerald-600" : "text-slate-400")} />
                              <h4 className="font-bold text-slate-900 text-sm">{tpl.name}</h4>
                              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                                tpl.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                              )}>
                                {tpl.isActive
                                  ? t({ uz: "Faol", en: "Active", ru: "Активен" })
                                  : t({ uz: "O'chiq", en: "Disabled", ru: "Отключен" })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-1">
                              <span className="font-semibold">{t({ uz: "Kalit", en: "Key", ru: "Ключ" })}:</span>{" "}
                              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{tpl.key}</code>
                            </p>
                            <p className="text-xs text-slate-600 mb-1"><span className="font-semibold">{t({ uz: "Mavzu", en: "Subject", ru: "Тема" })}:</span> {tpl.subject}</p>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1">{tpl.body}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                              onClick={() => toggleTemplate(tpl.id, tpl.isActive)} disabled={updateTemplateMutation.isPending}>
                              {tpl.isActive
                                ? <><ToggleRight className="h-3.5 w-3.5 text-emerald-600" />{t({ uz: "O'chirish", en: "Disable", ru: "Отключить" })}</>
                                : <><ToggleLeft className="h-3.5 w-3.5" />{t({ uz: "Yoqish", en: "Enable", ru: "Включить" })}</>}
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                              onClick={() => startEditTemplate(tpl)}>
                              <Edit3 className="h-3.5 w-3.5" />{t({ uz: "Tahrirlash", en: "Edit", ru: "Редактировать" })}
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

        {/* ══════════ EXCEL REPORTS ══════════ */}
        {section === "reports" && (
          <div className="animate-in fade-in-0 duration-200 space-y-5">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">{t({ uz: "Excel hisobotlar", en: "Excel reports", ru: "Excel-отчеты" })}</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {t({
                    uz: "Barcha ma'lumotlar .xlsx formatida yuklab olinadi. Microsoft Excel, Google Sheets yoki LibreOffice Calc bilan ochiladi.",
                    en: "All data is downloaded in .xlsx format and can be opened in Microsoft Excel, Google Sheets, or LibreOffice Calc.",
                    ru: "Все данные выгружаются в формате .xlsx и открываются в Microsoft Excel, Google Sheets или LibreOffice Calc.",
                  })}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <ExportCard
                title={t({ uz: "Foydalanuvchilar ro'yxati", en: "Users list", ru: "Список пользователей" })}
                description={t({ uz: "Barcha foydalanuvchilar: ismi, email, roli, kafedrasi, ilmiy darajasi, ro'yxatdan o'tgan sanasi", en: "All users: name, email, role, department, scientific degree, registration date", ru: "Все пользователи: имя, email, роль, кафедра, ученая степень, дата регистрации" })}
                icon={Users}
                accent="blue"
                filename="foydalanuvchilar.xlsx"
                onDownload={() => downloadExcel(
                  `${apiBase}/api/admin/export/users`,
                  `foydalanuvchilar_${new Date().toISOString().slice(0,10)}.xlsx`,
                  (v) => setDownloading(v ? "users" : null),
                  toast
                )}
                isLoading={downloading === "users"}
                downloadLabel={t({ uz: "Yuklab olish", en: "Download", ru: "Скачать" })}
                loadingLabel={t({ uz: "Yuklanmoqda...", en: "Downloading...", ru: "Загрузка..." })}
              />

              <ExportCard
                title={t({ uz: "Arizalar ro'yxati", en: "Submissions list", ru: "Список заявок" })}
                description={t({ uz: "Barcha arizalar: sarlavha, muallif, tur, holat, ekspert izohi, yuborilgan sana", en: "All submissions: title, author, type, status, expert note, submission date", ru: "Все заявки: название, автор, тип, статус, комментарий эксперта, дата отправки" })}
                icon={FileText}
                accent="violet"
                filename="arizalar.xlsx"
                onDownload={() => downloadExcel(
                  `${apiBase}/api/admin/export/submissions`,
                  `arizalar_${new Date().toISOString().slice(0,10)}.xlsx`,
                  (v) => setDownloading(v ? "submissions" : null),
                  toast
                )}
                isLoading={downloading === "submissions"}
                downloadLabel={t({ uz: "Yuklab olish", en: "Download", ru: "Скачать" })}
                loadingLabel={t({ uz: "Yuklanmoqda...", en: "Downloading...", ru: "Загрузка..." })}
              />

              <ExportCard
                title={t({ uz: "Ekspert xulosalari ro'yxati", en: "Expert conclusions list", ru: "Список экспертных заключений" })}
                description={t({ uz: "Barcha ekspert xulosalari: ekspert, baho, ilmiy qiymat, originalligi, xulosa, yakunlangan sana", en: "All expert conclusions: expert, scores, scientific value, originality, conclusion, completion date", ru: "Все экспертные заключения: эксперт, оценки, научная ценность, оригинальность, заключение, дата завершения" })}
                icon={CheckCircle}
                accent="emerald"
                filename="taqrizlar.xlsx"
                onDownload={() => downloadExcel(
                  `${apiBase}/api/admin/export/reviews`,
                  `taqrizlar_${new Date().toISOString().slice(0,10)}.xlsx`,
                  (v) => setDownloading(v ? "reviews" : null),
                  toast
                )}
                isLoading={downloading === "reviews"}
                downloadLabel={t({ uz: "Yuklab olish", en: "Download", ru: "Скачать" })}
                loadingLabel={t({ uz: "Yuklanmoqda...", en: "Downloading...", ru: "Загрузка..." })}
              />

              <ExportCard
                title={t({ uz: "Statistika xulosasi", en: "Statistics summary", ru: "Сводная статистика" })}
                description={t({ uz: "Arizalar va foydalanuvchilar bo'yicha umumiy statistika - 2 ta varaqda", en: "Overall submission and user statistics in 2 sheets", ru: "Общая статистика по заявкам и пользователям на 2 листах" })}
                icon={TrendingUp}
                accent="amber"
                filename="statistika.xlsx"
                onDownload={() => downloadExcel(
                  `${apiBase}/api/admin/export/stats`,
                  `statistika_${new Date().toISOString().slice(0,10)}.xlsx`,
                  (v) => setDownloading(v ? "stats" : null),
                  toast
                )}
                isLoading={downloading === "stats"}
                downloadLabel={t({ uz: "Yuklab olish", en: "Download", ru: "Скачать" })}
                loadingLabel={t({ uz: "Yuklanmoqda...", en: "Downloading...", ru: "Загрузка..." })}
              />
            </div>

            {/* Instructions */}
            <Card className="p-5 bg-slate-50/70">
              <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                {t({ uz: "Yuklab olish tartibi", en: "Download instructions", ru: "Порядок скачивания" })}
              </h4>
              <ol className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-start gap-2"><span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>{t({ uz: "Kerakli hisobot kartochkasidagi Yuklab olish tugmasini bosing.", en: "Click Download on the required report card.", ru: "Нажмите Скачать на нужной карточке отчета." })}</li>
                <li className="flex items-start gap-2"><span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>{t({ uz: "Fayl avtomatik ravishda brauzeringizga yuklanadi.", en: "The file will be downloaded by your browser automatically.", ru: "Файл автоматически загрузится в браузере." })}</li>
                <li className="flex items-start gap-2"><span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>{t({ uz: "Faylni Microsoft Excel, Google Sheets yoki LibreOffice Calc dasturida oching.", en: "Open the file in Microsoft Excel, Google Sheets, or LibreOffice Calc.", ru: "Откройте файл в Microsoft Excel, Google Sheets или LibreOffice Calc." })}</li>
                <li className="flex items-start gap-2"><span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>{t({ uz: "Ma'lumotlar tanlangan portal tiliga mos sarlavhalar bilan taqdim etiladi.", en: "Data is presented with headers aligned to the selected portal language.", ru: "Данные отображаются с заголовками, соответствующими выбранному языку портала." })}</li>
              </ol>
            </Card>
          </div>
        )}

        {/* ══════════ AUDIT LOGS ══════════ */}
        {section === "logs" && (
          <div className="animate-in fade-in-0 duration-200 space-y-4">
            <Card className="overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border bg-white flex items-center justify-between">
                <h3 className="font-bold font-serif text-slate-800 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  {t({ uz: "Harakatlar tarixi", en: "Activity history", ru: "История действий" })}
                  {auditData?.total != null && (
                    <span className="text-xs font-normal text-muted-foreground">
                      ({auditData.total} {t({ uz: "ta yozuv", en: "records", ru: "записей" })})
                    </span>
                  )}
                </h3>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => refetchAudit()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t({ uz: "Yangilash", en: "Refresh", ru: "Обновить" })}
                </Button>
              </div>

              {auditLoading ? (
                <div className="flex justify-center py-16"><LoadingSpinner /></div>
              ) : !auditData?.items?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <Activity className="h-14 w-14 mb-3" />
                  <p className="text-sm text-slate-400">
                    {t({ uz: "Hali hech qanday harakatlar qayd etilmagan", en: "No actions have been recorded yet", ru: "Действия пока не зафиксированы" })}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-b border-border/70">
                      <tr>
                        <th className="px-5 py-3 font-semibold">{t({ uz: "Harakat", en: "Action", ru: "Действие" })}</th>
                        <th className="px-5 py-3 font-semibold hidden md:table-cell">{t({ uz: "Tafsilot", en: "Details", ru: "Детали" })}</th>
                        <th className="px-5 py-3 font-semibold">{t({ uz: "Foydalanuvchi", en: "User", ru: "Пользователь" })}</th>
                        <th className="px-5 py-3 font-semibold hidden lg:table-cell">IP</th>
                        <th className="px-5 py-3 font-semibold text-right">{t({ uz: "Sana", en: "Date", ru: "Дата" })}</th>
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
                                <span className="font-medium text-slate-800 text-sm whitespace-nowrap">{getActionLabel(log.action)}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 text-xs max-w-[220px] truncate hidden md:table-cell">{formatAuditDetail(log.detail) || "—"}</td>
                            <td className="px-5 py-3.5">
                              <div>
                                <p className="text-xs font-medium text-slate-700">{log.userEmail || t({ uz: "Tizim", en: "System", ru: "Система" })}</p>
                                {log.userRole && (
                                  <p className="text-[11px] text-slate-400 mt-0.5">{getLocalizedRoleLabel(log.userRole, locale)}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 text-xs font-mono hidden lg:table-cell">{log.ipAddress || "—"}</td>
                            <td className="px-5 py-3.5 text-right text-xs text-slate-400 whitespace-nowrap">{formatDate(log.createdAt, locale)}</td>
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

function DictPanel({ title, icon: Icon, count, inputValue, onInputChange, onAdd, adding, placeholder, addLabel, emptyLabel, children }: {
  title: string; icon: any; count: number;
  inputValue: string; onInputChange: (v: string) => void;
  onAdd: (e: React.FormEvent) => void; adding: boolean;
  placeholder: string; addLabel: string; emptyLabel: string; children: React.ReactNode;
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
          <Input placeholder={placeholder} value={inputValue} onChange={e => onInputChange(e.target.value)} className="flex-1 h-9 text-sm" />
          <Button type="submit" size="sm" disabled={!inputValue.trim() || adding} className="shrink-0 gap-1">
            <Plus className="h-3.5 w-3.5" />{addLabel}
          </Button>
        </form>
        <div className="max-h-[400px] overflow-y-auto border border-border/50 rounded-xl divide-y divide-border/30">
          {React.Children.count(children) === 0
            ? <p className="p-6 text-center text-sm text-slate-400">{emptyLabel}</p>
            : children}
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

function ExportCard({ title, description, icon: Icon, accent, filename, onDownload, isLoading, downloadLabel, loadingLabel }: {
  title: string; description: string; icon: any; accent: string;
  filename: string; onDownload: () => void; isLoading: boolean; downloadLabel: string; loadingLabel: string;
}) {
  const accentMap: Record<string, { bg: string; icon: string; border: string; btn: string }> = {
    blue:    { bg: "bg-blue-50",    icon: "text-blue-600 bg-blue-100",    border: "border-blue-100",    btn: "bg-blue-600 hover:bg-blue-700 text-white" },
    violet:  { bg: "bg-violet-50",  icon: "text-violet-600 bg-violet-100",border: "border-violet-100",  btn: "bg-violet-600 hover:bg-violet-700 text-white" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600 bg-emerald-100",border:"border-emerald-100",btn: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    amber:   { bg: "bg-amber-50",   icon: "text-amber-600 bg-amber-100",  border: "border-amber-100",   btn: "bg-amber-600 hover:bg-amber-700 text-white" },
  };
  const a = accentMap[accent] || accentMap.blue;

  return (
    <Card className={cn("p-5 border shadow-sm hover:shadow-md transition-all", a.border)}>
      <div className="flex items-start gap-4">
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", a.icon)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 text-sm mb-1">{title}</h4>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">{description}</p>
          <code className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{filename}</code>
        </div>
      </div>
      <button
        onClick={onDownload}
        disabled={isLoading}
        className={cn(
          "mt-4 w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
          a.btn,
          isLoading && "opacity-60 cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <><RefreshCw className="h-4 w-4 animate-spin" />{loadingLabel}</>
        ) : (
          <><Download className="h-4 w-4" />{downloadLabel}</>
        )}
      </button>
    </Card>
  );
}
