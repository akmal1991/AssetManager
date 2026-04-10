import React, { useState } from "react";
import { useLogin, useRegister, useGetDepartments } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button, Card, Input, Select, PageTransition } from "@/components/ui/shared";
import { GraduationCap, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/i18n";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const { setToken, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { locale, t, withLocale } = useLocale();

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const { data: departments } = useGetDepartments();

  React.useEffect(() => {
    if (isAuthenticated && user) {
      setLocation(withLocale(`/dashboard/${user.role}`));
    }
  }, [isAuthenticated, setLocation, user, withLocale]);

  const onLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    loginMutation.mutate(
      { data: Object.fromEntries(formData) as any },
      {
        onSuccess: (res) => {
          setToken(res.token);
          toast({
            title: t({ uz: "Muvaffaqiyatli", en: "Success", ru: "Успешно" }),
            description: t({ uz: "Tizimga kirdingiz", en: "You are signed in", ru: "Вы вошли в систему" }),
          });
        },
        onError: () => {
          toast({
            title: t({ uz: "Xatolik", en: "Error", ru: "Ошибка" }),
            description: t({
              uz: "Email yoki parol noto'g'ri",
              en: "Incorrect email or password",
              ru: "Неверный email или пароль",
            }),
            variant: "destructive",
          });
        },
      },
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
          toast({
            title: t({ uz: "Muvaffaqiyatli", en: "Success", ru: "Успешно" }),
            description: t({ uz: "Ro'yxatdan o'tdingiz", en: "Registration completed", ru: "Регистрация завершена" }),
          });
        },
        onError: (err: any) => {
          toast({
            title: t({ uz: "Xatolik", en: "Error", ru: "Ошибка" }),
            description: err.message || t({ uz: "Xatolik yuz berdi", en: "Something went wrong", ru: "Что-то пошло не так" }),
            variant: "destructive",
          });
        },
      },
    );
  };

  const copy = {
    heroTitle: t({ uz: "Universitet\nIlmiy Nashr Portali", en: "University\nScientific Publishing Portal", ru: "Университетский\nпортал научных изданий" }),
    heroBody: t({
      uz: "Akademik adabiyotlarni elektron qabul qilish, ekspertizadan o'tkazish va nashrga tavsiya etish tizimi.",
      en: "A digital system for receiving academic works, coordinating peer review, and preparing publications.",
      ru: "Цифровая система для приема научных работ, организации экспертизы и подготовки к публикации.",
    }),
    heroFooter: t({
      uz: "Ilmiy faoliyatni raqamlashtirish",
      en: "Digitalizing academic publishing",
      ru: "Цифровизация научной деятельности",
    }),
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-primary text-primary-foreground overflow-hidden">
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
            <h1 className="text-3xl font-serif font-bold tracking-tight whitespace-pre-line">{copy.heroTitle}</h1>
          </div>
          <p className="text-lg text-primary-foreground/80 max-w-md font-light leading-relaxed">{copy.heroBody}</p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-primary-foreground/70">
          <div className="h-px bg-primary-foreground/20 flex-1" />
          <span>{copy.heroFooter}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 lg:px-24 xl:px-32 py-12 bg-background relative">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/pattern-overlay.png)` }} />

        <PageTransition className="w-full max-w-md mx-auto relative z-10">
          <div className="text-center mb-10">
            <div className="mb-5 flex items-center justify-center gap-2 rounded-full border border-border bg-card px-2 py-2">
              {(["uz", "en", "ru"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocation(`/${code}${withLocale("/login").replace(`/${locale}`, "")}`)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${code === locale ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <h2 className="text-3xl font-serif font-bold text-foreground mb-2">
              {isLogin
                ? t({ uz: "Tizimga kirish", en: "Sign in", ru: "Вход в систему" })
                : t({ uz: "Ro'yxatdan o'tish", en: "Create account", ru: "Регистрация" })}
            </h2>
            <p className="text-muted-foreground">
              {isLogin
                ? t({ uz: "Ma'lumotlaringizni kiriting", en: "Enter your account details", ru: "Введите данные вашей учетной записи" })
                : t({ uz: "Yangi profil yarating", en: "Create a new profile", ru: "Создайте новый профиль" })}
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
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t({ uz: "Parol", en: "Password", ru: "Пароль" })}
                  </label>
                  <Input name="password" type="password" placeholder="********" required />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loginMutation.isPending}>
                  {loginMutation.isPending
                    ? t({ uz: "Kutib turing...", en: "Please wait...", ru: "Подождите..." })
                    : t({ uz: "Kirish", en: "Sign in", ru: "Войти" })}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            ) : (
              <form onSubmit={onRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t({ uz: "F.I.Sh", en: "Full name", ru: "Ф.И.О." })}</label>
                  <Input name="fullName" placeholder={t({ uz: "To'liq ismingiz", en: "Your full name", ru: "Ваше полное имя" })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <Input name="email" type="email" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t({ uz: "Telefon", en: "Phone", ru: "Телефон" })}</label>
                    <Input name="phone" type="tel" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t({ uz: "Parol", en: "Password", ru: "Пароль" })}</label>
                  <Input name="password" type="password" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t({ uz: "Kafedra", en: "Department", ru: "Кафедра" })}</label>
                  <Select name="departmentId" required>
                    <option value="">{t({ uz: "Kafedrani tanlang", en: "Select a department", ru: "Выберите кафедру" })}</option>
                    {departments?.map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t({ uz: "Ilmiy daraja", en: "Scientific degree", ru: "Ученая степень" })}</label>
                    <Select name="scientificDegree" required>
                      <option value="none">{t({ uz: "Yo'q", en: "None", ru: "Нет" })}</option>
                      <option value="PhD">PhD</option>
                      <option value="DSc">DSc</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t({ uz: "Lavozim", en: "Position", ru: "Должность" })}</label>
                    <Select name="position" required>
                      <option value="teacher">{t({ uz: "O'qituvchi", en: "Teacher", ru: "Преподаватель" })}</option>
                      <option value="senior_teacher">{t({ uz: "Katta o'qituvchi", en: "Senior teacher", ru: "Старший преподаватель" })}</option>
                      <option value="associate_professor">{t({ uz: "Dotsent", en: "Associate professor", ru: "Доцент" })}</option>
                      <option value="professor">{t({ uz: "Professor", en: "Professor", ru: "Профессор" })}</option>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full mt-2" size="lg" disabled={registerMutation.isPending}>
                  {registerMutation.isPending
                    ? t({ uz: "Yaratilmoqda...", en: "Creating...", ru: "Создание..." })
                    : t({ uz: "Profil yaratish", en: "Create profile", ru: "Создать профиль" })}
                  <UserPlus className="ml-2 h-5 w-5" />
                </Button>
              </form>
            )}
          </Card>

          <div className="mt-8 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary font-semibold hover:underline flex items-center justify-center w-full gap-2">
              {isLogin ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  {t({
                    uz: "Profilingiz yo'qmi? Ro'yxatdan o'ting",
                    en: "No account yet? Register",
                    ru: "Нет аккаунта? Зарегистрируйтесь",
                  })}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  {t({
                    uz: "Akkauntingiz bormi? Tizimga kiring",
                    en: "Already have an account? Sign in",
                    ru: "Уже есть аккаунт? Войдите",
                  })}
                </>
              )}
            </button>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}
