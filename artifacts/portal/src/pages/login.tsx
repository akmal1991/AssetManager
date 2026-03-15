import React, { useState } from "react";
import { useLogin, useRegister, useGetDepartments } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button, Card, Input, Select, PageTransition } from "@/components/ui/shared";
import { GraduationCap, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const { setToken, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const { data: departments } = useGetDepartments();

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated && user) {
      setLocation(`/dashboard/${user.role}`);
    }
  }, [isAuthenticated, user, setLocation]);

  const onLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    loginMutation.mutate(
      { data: Object.fromEntries(formData) as any },
      {
        onSuccess: (res) => {
          setToken(res.token);
          toast({ title: "Muvaffaqiyatli", description: "Tizimga kirdingiz" });
        },
        onError: () => {
          toast({ title: "Xatolik", description: "Email yoki parol noto'g'ri", variant: "destructive" });
        }
      }
    );
  };

  const onRegisterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData) as any;
    data.departmentId = Number(data.departmentId);
    
    registerMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          setToken(res.token);
          toast({ title: "Muvaffaqiyatli", description: "Ro'yxatdan o'tdingiz" });
        },
        onError: (err: any) => {
          toast({ title: "Xatolik", description: err.message || "Xatolik yuz berdi", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Image & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-primary text-primary-foreground overflow-hidden">
        {/* Unsplash abstract architecture */}
        {/* abstract university library building columns */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-overlay"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/auth-bg.png), url(https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1920&q=80)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <GraduationCap className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">Universitet<br/>Ilmiy Nashr Portali</h1>
          </div>
          <p className="text-lg text-primary-foreground/80 max-w-md font-light leading-relaxed">
            Akademik adabiyotlarni elektron qabul qilish, ekspertizadan o'tkazish va nashrga tavsiya etish tizimi.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-primary-foreground/70">
          <div className="h-px bg-primary-foreground/20 flex-1" />
          <span>Ilmiy faoliyatni raqamlashtirish</span>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 lg:px-24 xl:px-32 py-12 bg-background relative">
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none" 
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/pattern-overlay.png)` }}
        />
        
        <PageTransition className="w-full max-w-md mx-auto relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-2">
              {isLogin ? "Tizimga kirish" : "Ro'yxatdan o'tish"}
            </h2>
            <p className="text-muted-foreground">
              {isLogin ? "Ma'lumotlaringizni kiriting" : "Yangi profil yarating"}
            </p>
          </div>

          <Card className="p-8 backdrop-blur-xl bg-white/50">
            {isLogin ? (
              <form onSubmit={onLoginSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <Input name="email" type="email" placeholder="email@uni.uz" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Parol</label>
                  <Input name="password" type="password" placeholder="••••••••" required />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Kutib turing..." : "Kirish"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            ) : (
              <form onSubmit={onRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">F.I.Sh</label>
                  <Input name="fullName" placeholder="To'liq ismingiz" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <Input name="email" type="email" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Telefon</label>
                    <Input name="phone" type="tel" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Parol</label>
                  <Input name="password" type="password" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kafedra</label>
                  <Select name="departmentId" required>
                    <option value="">Kafedrani tanlang</option>
                    {departments?.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Ilmiy daraja</label>
                    <Select name="scientificDegree" required>
                      <option value="none">Yo'q</option>
                      <option value="PhD">PhD</option>
                      <option value="DSc">DSc</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Lavozim</label>
                    <Select name="position" required>
                      <option value="teacher">O'qituvchi</option>
                      <option value="senior_teacher">Katta o'qituvchi</option>
                      <option value="associate_professor">Dotsent</option>
                      <option value="professor">Professor</option>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full mt-2" size="lg" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Yaratilmoqda..." : "Profil yaratish"}
                  <UserPlus className="ml-2 h-5 w-5" />
                </Button>
              </form>
            )}
          </Card>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary font-semibold hover:underline flex items-center justify-center w-full gap-2"
            >
              {isLogin ? (
                <><UserPlus className="h-4 w-4"/> Profilingiz yo'qmi? Ro'yxatdan o'ting</>
              ) : (
                <><LogIn className="h-4 w-4"/> Akkauntingiz bormi? Tizimga kiring</>
              )}
            </button>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}
