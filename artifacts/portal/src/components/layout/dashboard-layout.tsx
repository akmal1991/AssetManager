import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/shared";
import { 
  BookOpen, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  GraduationCap,
  Globe,
  Bell,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LINKS = {
  author: [
    { href: "/dashboard/author", label: "Mening asarlarim", icon: BookOpen },
    { href: "/submissions/new", label: "Yangi yuborish", icon: FileText },
  ],
  editor: [
    { href: "/dashboard/editor", label: "Kelib tushganlar", icon: FileText },
    { href: "/dashboard/editor/decisions", label: "Qarorlar", icon: BookOpen },
  ],
  reviewer: [
    { href: "/dashboard/reviewer", label: "Mening taqrizlarim", icon: FileText },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Bosh panel", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "Foydalanuvchilar", icon: Users },
    { href: "/dashboard/admin/settings", label: "Sozlamalar", icon: Settings },
  ]
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (!user) return null;

  const links = ROLE_LINKS[user.role as keyof typeof ROLE_LINKS] || [];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-accent" />
          <span className="font-serif font-bold text-lg">Ilmiy Nashr</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-10 h-10 object-contain" />
          <div>
            <h2 className="font-serif font-bold text-xl leading-none">Ilmiy Nashr</h2>
            <p className="text-xs text-sidebar-foreground/60 mt-1 uppercase tracking-wider">Universitet Portali</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-black/10" 
                    : "hover:bg-sidebar-border/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className={cn("h-5 w-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="bg-sidebar-border/30 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg shadow-inner">
                {user.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.fullName}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize truncate">{user.role}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Chiqish
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="text-2xl font-serif font-bold text-foreground">
            {links.find(l => l.href === location)?.label || "Boshqaruv Paneli"}
          </h1>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="hidden md:flex text-muted-foreground">
              <Globe className="h-5 w-5 mr-2" />
              O'zbekcha
            </Button>
            <Button variant="outline" size="sm" className="relative p-2 h-10 w-10 rounded-full">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-destructive rounded-full border-2 border-white"></span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
