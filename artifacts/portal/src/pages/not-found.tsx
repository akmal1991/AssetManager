import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              {t({
                uz: "404 Sahifa topilmadi",
                en: "404 Page not found",
                ru: "404 Страница не найдена",
              })}
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            {t({
              uz: "Sahifa manzili noto'g'ri yoki routerga ulanmagan.",
              en: "The page address is incorrect or the route has not been registered.",
              ru: "Адрес страницы неверный или маршрут еще не зарегистрирован.",
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
