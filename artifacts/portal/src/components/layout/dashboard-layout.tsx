import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button, Badge } from "@/components/ui/shared";
import { 
  BookOpen, 
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
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LINKS = {
  author: [
    { href: "/dashboard/author", label: "Dashboard", icon: LayoutDashboard },
    { href: "/submissions/new", label: "Yangi ariza", icon: FilePlus },
    { href: "/dashboard/author/submissions", label: "Mening qo'lyozmalarim", icon: FileText },
  ],
  editor: [
    { href: "/dashboard/editor", label: "Arizalar navbati", icon: Inbox },
    { href: "/dashboard/editor/reviewers", label: "Taqrizchilar bazasi", icon: Users },
    { href: "/dashboard/editor/decisions", label: "Nashr qarorlari", icon: CheckSquare },
  ],
  reviewer: [
    { href: "/dashboard/reviewer", label: "Topshiriqlar", icon: ClipboardList },
    { href: "/dashboard/reviewer/history", label: "Taqrizlar tarixi", icon: History },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Boshqaruv paneli", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "Foydalanuvchilar", icon: Users },
    { href: "/dashboard/admin/dictionaries", label: "Lug'atlar", icon: BookOpen },
    { href: "/dashboard/admin/logs", label: "Tizim loglari", icon: Activity },
  ]
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [language, setLanguage] = useState("UZ");

  if (!user) return null;

  const links = ROLE_LINKS[user.role as keyof typeof ROLE_LINKS] || [];

  const toggleLanguage = () => {
    const langs = ["UZ", "RU", "EN"];
    const currentIndex = langs.indexOf(language);
    setLanguage(langs[(currentIndex + 1) % langs.length]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-primary text-primary-foreground border-b border-primary/20 shadow-md">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8" />
          <span className="font-serif font-bold text-lg">Universitet Portali</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar - FIXED ON DESKTOP */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out md:sticky md:translate-x-0 md:shrink-0",
        isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-sidebar-border/50">
          <GraduationCap className="h-10 w-10 text-sidebar-primary shrink-0" />
          <div>
            <h2 className="font-serif font-bold text-xl leading-none text-white">Ilmiy Nashr</h2>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            // Match exactly or starts with for active state (if not exact dashboard)
            const isActive = location === link.href || (link.href !== `/dashboard/${user.role}` && location.startsWith(link.href));
            
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                    : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-white"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className={cn("h-5 w-5 transition-transform duration-200", isActive ? "" : "group-hover:scale-110")} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="bg-sidebar-border/30 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-lg shadow-inner shrink-0">
                {user.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white">{user.fullName}</p>
                <Badge variant="outline" className="mt-1 text-[10px] bg-primary/20 text-white border-primary-foreground/20 capitalize tracking-wide px-2 py-0">
                  {user.role}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-white hover:bg-destructive/80 mt-2 transition-colors" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Chiqish
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/20">
        {/* Top Header */}
        <header className="h-20 bg-card backdrop-blur-md border-b border-border flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm shrink-0">
          <div className="flex-1 flex justify-center md:justify-start">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-primary tracking-tight">
              Universitet Nashriyot Portali
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={toggleLanguage} className="hidden md:flex text-foreground border-border hover:bg-muted font-medium w-16">
              <Globe className="h-4 w-4 mr-2 text-primary" />
              {language}
            </Button>
            <Button variant="ghost" size="sm" className="relative p-2 h-10 w-10 rounded-full hover:bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-destructive rounded-full border-2 border-card"></span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
