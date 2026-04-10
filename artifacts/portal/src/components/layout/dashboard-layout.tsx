import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/shared";
import {
  LayoutDashboard,
  Users,
  FileText,
  LogOut,
  GraduationCap,
  Globe,
  Bell,
  Menu,
  X,
  FilePlus,
  Inbox,
  CheckSquare,
  ClipboardList,
  History,
  Activity,
  Mail,
  Settings2,
  ShieldCheck,
  Download,
} from "lucide-react";
import { cn, getLocalizedRoleLabel } from "@/lib/utils";
import { LOCALE_LABELS, SUPPORTED_LOCALES, useLocale, type Locale } from "@/lib/i18n";

const ROLE_COLORS: Record<string, string> = {
  author: "bg-blue-500/20 text-blue-200 border-blue-400/30",
  editor: "bg-violet-500/20 text-violet-200 border-violet-400/30",
  reviewer: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  admin: "bg-red-500/20 text-red-200 border-red-400/30",
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { location, locale, t, withLocale, switchLocale, stripLocale } = useLocale();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (!user) return null;

  const roleLinks = {
    author: [
      { href: "/dashboard/author", label: t({ uz: "Dashboard", en: "Dashboard", ru: "Панель" }), icon: LayoutDashboard },
      { href: "/submissions/new", label: t({ uz: "Yangi ariza", en: "New submission", ru: "Новая заявка" }), icon: FilePlus },
      { href: "/dashboard/author/submissions", label: t({ uz: "Mening qo'lyozmalarim", en: "My manuscripts", ru: "Мои рукописи" }), icon: FileText },
    ],
    editor: [
      { href: "/dashboard/editor", label: t({ uz: "Arizalar navbati", en: "Submission queue", ru: "Очередь заявок" }), icon: Inbox },
      { href: "/dashboard/editor/reviewers", label: t({ uz: "Taqrizchilar bazasi", en: "Reviewer pool", ru: "База рецензентов" }), icon: Users },
      { href: "/dashboard/editor/decisions", label: t({ uz: "Nashr qarorlari", en: "Publishing decisions", ru: "Издательские решения" }), icon: CheckSquare },
    ],
    reviewer: [
      { href: "/dashboard/reviewer", label: t({ uz: "Topshiriqlar", en: "Assignments", ru: "Задания" }), icon: ClipboardList },
      { href: "/dashboard/reviewer/history", label: t({ uz: "Taqrizlar tarixi", en: "Review history", ru: "История рецензий" }), icon: History },
    ],
    admin: [
      { href: "/dashboard/admin", label: t({ uz: "Statistika", en: "Statistics", ru: "Статистика" }), icon: LayoutDashboard, exact: true },
      { href: "/dashboard/admin/submissions", label: t({ uz: "Ilmiy ishlar", en: "Scientific works", ru: "Научные работы" }), icon: FileText },
      { href: "/dashboard/editor", label: t({ uz: "Jarayon boshqaruvi", en: "Workflow management", ru: "Управление процессом" }), icon: Inbox },
      { href: "/dashboard/admin/users", label: t({ uz: "Foydalanuvchilar", en: "Users", ru: "Пользователи" }), icon: Users },
      { href: "/dashboard/admin/dictionaries", label: t({ uz: "Lug'at sozlamalari", en: "Dictionaries", ru: "Справочники" }), icon: Settings2 },
      { href: "/dashboard/admin/email-templates", label: t({ uz: "Email shablonlari", en: "Email templates", ru: "Почтовые шаблоны" }), icon: Mail },
      { href: "/dashboard/admin/reports", label: t({ uz: "Excel hisobotlar", en: "Excel reports", ru: "Excel-отчеты" }), icon: Download },
      { href: "/dashboard/admin/logs", label: t({ uz: "Audit loglari", en: "Audit logs", ru: "Журнал аудита" }), icon: Activity },
    ],
  } as const;

  const links = roleLinks[user.role as keyof typeof roleLinks] || [];

  const currentPath = stripLocale(location);
  const brandTitle = t({ uz: "Ilmiy Nashr Portali", en: "Scientific Publishing Portal", ru: "Портал научных изданий" });
  const brandSubtitle = t({ uz: "Akademik tizim", en: "Academic system", ru: "Академическая система" });

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between p-4 bg-primary text-primary-foreground border-b border-primary/20 shadow-md">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7" />
          <span className="font-serif font-bold text-base">{brandTitle}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-lg hover:bg-white/10">
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out md:sticky md:translate-x-0 md:shrink-0",
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <div className="p-5 flex items-center gap-3 border-b border-sidebar-border/40">
          <div className="h-9 w-9 bg-sidebar-primary rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif font-bold text-base leading-tight text-white truncate">{brandTitle}</h2>
            <p className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5">{brandSubtitle}</p>
          </div>
        </div>

        <div className="px-4 pt-4 pb-2">
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold", ROLE_COLORS[user.role] || ROLE_COLORS.author)}>
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>{getLocalizedRoleLabel(user.role, locale)}</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const localizedHref = withLocale(link.href);
            const isActive = (link as any).exact
              ? currentPath === link.href
              : currentPath === link.href || currentPath.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={localizedHref}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group font-medium text-sm",
                  isActive ? "bg-sidebar-primary text-white shadow-md" : "text-white/60 hover:bg-sidebar-accent hover:text-white",
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-white/50 group-hover:text-white")} />
                <span className="truncate">{link.label}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border/40">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-2">
            <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center font-bold text-sm text-white shrink-0 shadow">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
              <p className="text-xs text-white/40 truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/60 hover:text-white hover:bg-red-500/20 text-sm h-9"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2 shrink-0" />
            {t({ uz: "Chiqish", en: "Log out", ru: "Выйти" })}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-muted/20">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <h1 className="text-lg font-serif font-bold text-primary hidden md:block">
              {t({ uz: "Universitet Nashriyot Portali", en: "University Publishing Portal", ru: "Университетский издательский портал" })}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center rounded-full border border-border bg-background p-1">
              {SUPPORTED_LOCALES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => switchLocale(item as Locale)}
                  className={cn(
                    "h-8 min-w-10 rounded-full px-3 text-xs font-semibold transition-colors",
                    item === locale ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                  title={LOCALE_LABELS[item]}
                >
                  <span className="inline-flex items-center gap-1">
                    {item === locale && <Globe className="h-3.5 w-3.5" />}
                    {LOCALE_LABELS[item]}
                  </span>
                </button>
              ))}
            </div>
            <button className="relative p-2 h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center">
              <Bell className="h-4.5 w-4.5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full border-2 border-card" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
