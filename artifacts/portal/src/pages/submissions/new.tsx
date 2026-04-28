import React, { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useCreateSubmission,
  useGetDepartments,
  useGetScientificDirections,
  useUploadDocument,
} from "@workspace/api-client-react";
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  PageTransition,
} from "@/components/ui/shared";
import {
  UploadCloud,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  FileType,
  Check,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getLocalizedLiteratureType } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

type FormDataState = {
  title: string;
  abstract: string;
  language: string;
  departmentId: string;
  scientificDirection: string;
  literatureType: string;
  keywords: string;
};

type WizardErrors = Partial<
  Record<
    "title" | "abstract" | "keywords" | "departmentId" | "scientificDirection" | "literatureType" | "files" | "form",
    string
  >
>;

export default function NewSubmissionWizard() {
  const [step, setStep] = useState(1);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormDataState>({
    title: "",
    abstract: "",
    language: "uz",
    departmentId: "",
    scientificDirection: "",
    literatureType: "",
    keywords: "",
  });
  const [files, setFiles] = useState<Record<string, File>>({});
  const [uploadProgress, setUploadProgress] = useState<
    Record<string, "pending" | "uploading" | "done">
  >({});
  const [errors, setErrors] = useState<WizardErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { locale, t, withLocale } = useLocale();

  const { data: departments } = useGetDepartments();
  const { data: directionsData } = useGetScientificDirections();
  const createMutation = useCreateSubmission();
  const uploadMutation = useUploadDocument();

  const scientificDirections = directionsData?.map((direction) => direction.name) ?? [];
  const trimmedKeywords = useMemo(
    () => formData.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    [formData.keywords],
  );
  const requiredDocs = useMemo(() => [
    { type: "main_document", label: t({ uz: "Asosiy hujjat (Qo'lyozma)", en: "Main document (manuscript)", ru: "Основной документ (рукопись)" }) },
    { type: "internal_review", label: t({ uz: "Ichki taqriz", en: "Internal review", ru: "Внутренняя рецензия" }) },
    { type: "external_review", label: t({ uz: "Tashqi taqriz", en: "External review", ru: "Внешняя рецензия" }) },
    { type: "plagiarism_report", label: t({ uz: "Antiplagiat ma'lumotnomasi", en: "Plagiarism report", ru: "Справка антиплагиата" }) },
    { type: "curriculum", label: t({ uz: "O'quv reja", en: "Curriculum", ru: "Учебный план" }) },
    { type: "syllabus", label: t({ uz: "Sillabus / O'quv dasturi", en: "Syllabus / course program", ru: "Силлабус / учебная программа" }) },
  ], [t]);
  const literatureOptions = useMemo(() => [
    {
      id: "darslik",
      label: getLocalizedLiteratureType("darslik", locale),
      desc: t({ uz: "Oliy ta'lim uchun mo'ljallangan asosiy darslik", en: "Core textbook for higher education", ru: "Основной учебник для высшего образования" }),
    },
    {
      id: "oquv_qollanma",
      label: getLocalizedLiteratureType("oquv_qollanma", locale),
      desc: t({ uz: "Darslikni to'ldiruvchi qo'shimcha manba", en: "Supplementary learning resource", ru: "Дополнительный учебный источник" }),
    },
    {
      id: "monografiya",
      label: getLocalizedLiteratureType("monografiya", locale),
      desc: t({ uz: "Chuqur ilmiy tadqiqot ishi", en: "In-depth scientific research work", ru: "Углубленная научно-исследовательская работа" }),
    },
    {
      id: "oquv_uslubiy_qollanma",
      label: getLocalizedLiteratureType("oquv_uslubiy_qollanma", locale),
      desc: t({ uz: "Amaliy mashg'ulotlar uchun", en: "For practical classes", ru: "Для практических занятий" }),
    },
    {
      id: "uslubiy_korsatma",
      label: getLocalizedLiteratureType("uslubiy_korsatma", locale),
      desc: t({ uz: "Laboratoriya va mustaqil ishlar uchun", en: "For laboratory and independent work", ru: "Для лабораторных и самостоятельных работ" }),
    },
  ], [locale, t]);

  const summaryItems = [
    { label: t({ uz: "Asar nomi", en: "Work title", ru: "Название работы" }), value: formData.title || t({ uz: "Kiritilmagan", en: "Not provided", ru: "Не указано" }) },
    {
      label: t({ uz: "Til", en: "Language", ru: "Язык" }),
      value:
        formData.language === "uz"
          ? t({ uz: "O'zbek tili", en: "Uzbek", ru: "Узбекский" })
          : formData.language === "ru"
            ? t({ uz: "Rus tili", en: "Russian", ru: "Русский" })
            : t({ uz: "Ingliz tili", en: "English", ru: "Английский" }),
    },
    {
      label: t({ uz: "Ilmiy yo'nalish", en: "Scientific direction", ru: "Научное направление" }),
      value: formData.scientificDirection || t({ uz: "Tanlanmagan", en: "Not selected", ru: "Не выбрано" }),
    },
    {
      label: t({ uz: "Kafedra", en: "Department", ru: "Кафедра" }),
      value:
        departments?.find((department) => String(department.id) === formData.departmentId)?.name ??
        t({ uz: "Tanlanmagan", en: "Not selected", ru: "Не выбрано" }),
    },
    {
      label: t({ uz: "Adabiyot turi", en: "Literature type", ru: "Тип литературы" }),
      value: formData.literatureType
        ? getLocalizedLiteratureType(formData.literatureType, locale)
        : t({ uz: "Tanlanmagan", en: "Not selected", ru: "Не выбрано" }),
    },
    {
      label: t({ uz: "Kalit so'zlar", en: "Keywords", ru: "Ключевые слова" }),
      value: trimmedKeywords.length > 0 ? trimmedKeywords.join(", ") : t({ uz: "Kiritilmagan", en: "Not provided", ru: "Не указано" }),
    },
  ];

  const setFieldValue = (field: keyof FormDataState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined, files: undefined }));
  };

  const validateStep = (stepNumber: number) => {
    const nextErrors: WizardErrors = {};

    if (stepNumber === 1) {
      if (!formData.title.trim()) nextErrors.title = t({ uz: "Asar nomini kiriting.", en: "Enter the work title.", ru: "Введите название работы." });
      if (formData.title.trim().length > 255) nextErrors.title = t({ uz: "Asar nomi juda uzun.", en: "The title is too long.", ru: "Название слишком длинное." });
      if (!formData.abstract.trim()) nextErrors.abstract = t({ uz: "Annotatsiyani kiriting.", en: "Enter the abstract.", ru: "Введите аннотацию." });
      if (formData.abstract.trim().length < 20) {
        nextErrors.abstract = t({ uz: "Annotatsiya kamida 20 ta belgidan iborat bo'lsin.", en: "The abstract must contain at least 20 characters.", ru: "Аннотация должна содержать не менее 20 символов." });
      }
      if (trimmedKeywords.length > 10) {
        nextErrors.keywords = t({ uz: "Kalit so'zlar soni 10 tadan oshmasin.", en: "Use no more than 10 keywords.", ru: "Укажите не более 10 ключевых слов." });
      }
    }

    if (stepNumber === 2) {
      if (!formData.scientificDirection) {
        nextErrors.scientificDirection = t({ uz: "Ilmiy yo'nalishni tanlang.", en: "Select a scientific direction.", ru: "Выберите научное направление." });
      }
      if (!formData.departmentId) {
        nextErrors.departmentId = t({ uz: "Kafedrani tanlang.", en: "Select a department.", ru: "Выберите кафедру." });
      }
    }

    if (stepNumber === 3 && !formData.literatureType) {
      nextErrors.literatureType = t({ uz: "Adabiyot turini tanlang.", en: "Select the literature type.", ru: "Выберите тип литературы." });
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateFiles = () => {
    const missingDocs = requiredDocs.filter((doc) => !files[doc.type]);
    if (missingDocs.length > 0) {
      setErrors((prev) => ({
        ...prev,
        files: t({
          uz: `Quyidagi hujjatlarni biriktiring: ${missingDocs.map((doc) => doc.label).join(", ")}`,
          en: `Attach the following documents: ${missingDocs.map((doc) => doc.label).join(", ")}`,
          ru: `Прикрепите следующие документы: ${missingDocs.map((doc) => doc.label).join(", ")}`,
        }),
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, files: undefined }));
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      toast({
        title: t({ uz: "Tekshirib chiqing", en: "Please check", ru: "Проверьте данные" }),
        description: t({ uz: "Majburiy maydonlarni to'g'ri to'ldiring.", en: "Fill in the required fields correctly.", ru: "Корректно заполните обязательные поля." }),
        variant: "destructive",
      });
      return;
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setErrors((prev) => ({ ...prev, form: undefined, files: undefined }));
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFileSelect = (type: string, file: File | null) => {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const validExtension = [".pdf", ".doc", ".docx"].some((ext) => lowerName.endsWith(ext));
    if (!validExtension) {
      toast({
        title: t({ uz: "Noto'g'ri format", en: "Invalid format", ru: "Неверный формат" }),
        description: t({ uz: "Faqat PDF, DOC yoki DOCX fayllarini yuklang.", en: "Upload only PDF, DOC, or DOCX files.", ru: "Загружайте только файлы PDF, DOC или DOCX." }),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: t({ uz: "Fayl juda katta", en: "File is too large", ru: "Файл слишком большой" }),
        description: t({ uz: "Har bir fayl hajmi 100 MB dan oshmasligi kerak.", en: "Each file must not exceed 100 MB.", ru: "Размер каждого файла не должен превышать 100 МБ." }),
        variant: "destructive",
      });
      return;
    }

    setFiles((prev) => ({ ...prev, [type]: file }));
    setUploadProgress((prev) => ({ ...prev, [type]: "pending" }));
    setErrors((prev) => ({ ...prev, files: undefined }));
  };

  const ensureSubmissionExists = async () => {
    if (submissionId) return submissionId;

    const result = await createMutation.mutateAsync({
      data: {
        title: formData.title.trim(),
        abstract: formData.abstract.trim(),
        language: formData.language,
        departmentId: Number(formData.departmentId),
        scientificDirection: formData.scientificDirection,
        literatureType: formData.literatureType as any,
        keywords: trimmedKeywords,
      },
    });

    setSubmissionId(result.id);
    return result.id;
  };

  const handleFinalSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateFiles()) {
      toast({
        title: t({ uz: "Ma'lumot yetarli emas", en: "Incomplete information", ru: "Недостаточно данных" }),
        description: t({ uz: "Barcha bosqichlarni to'liq yakunlang.", en: "Complete all steps before submission.", ru: "Полностью завершите все этапы перед отправкой." }),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const currentSubmissionId = await ensureSubmissionExists();

      for (const doc of requiredDocs) {
        if (uploadProgress[doc.type] === "done") continue;

        const selectedFile = files[doc.type];
        if (!selectedFile) {
          throw new Error(`${doc.label} topilmadi.`);
        }

        setUploadProgress((prev) => ({ ...prev, [doc.type]: "uploading" }));

        await uploadMutation.mutateAsync({
          id: currentSubmissionId,
          data: { file: selectedFile, docType: doc.type },
        });

        setUploadProgress((prev) => ({ ...prev, [doc.type]: "done" }));
      }

      toast({
        title: t({ uz: "Muvaffaqiyatli yuborildi", en: "Successfully submitted", ru: "Успешно отправлено" }),
        description: t({ uz: "Ilmiy ish va barcha hujjatlar ekspertiza uchun saqlandi.", en: "The work and all documents were saved for expert review.", ru: "Работа и все документы сохранены для экспертной проверки." }),
      });
      setLocation(withLocale("/dashboard/author"));
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        t({ uz: "Yuborish jarayonida xatolik yuz berdi. Qayta urinib ko'ring.", en: "An error occurred during submission. Please try again.", ru: "Во время отправки произошла ошибка. Попробуйте еще раз." });

      setErrors((prev) => ({ ...prev, form: message }));
      setUploadProgress((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([key, value]) => [key, value === "uploading" ? "pending" : value]),
        ),
      );
      toast({ title: t({ uz: "Yuborib bo'lmadi", en: "Submission failed", ru: "Не удалось отправить" }), description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allFilesSelected = requiredDocs.every((doc) => Boolean(files[doc.type]));

  const renderFieldError = (field: keyof WizardErrors) =>
    errors[field] ? <p className="mt-2 text-sm text-red-600">{errors[field]}</p> : null;

  const renderStepActions = () => (
    <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
      <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1} className="w-32">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t({ uz: "Orqaga", en: "Back", ru: "Назад" })}
      </Button>
      <Button type="button" onClick={handleNext} className="w-48 shadow-lg shadow-primary/20">
        {t({ uz: "Keyingisi", en: "Next", ru: "Далее" })}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="w-full max-w-4xl min-w-0 mx-auto py-6 md:py-8">
          <div className="mb-10">
            <h2 className="text-3xl font-serif font-bold text-primary">
              {t({
                uz: "Yangi ilmiy ish yuborish",
                en: "Submit a new scientific work",
                ru: "Отправить новую научную работу",
              })}
            </h2>
            <p className="text-muted-foreground mt-2">
              {t({
                uz: "To'liq ma'lumotlarni kiriting va hujjatlarni biriktiring.",
                en: "Enter the complete details and attach the required documents.",
                ru: "Заполните все сведения и прикрепите необходимые документы.",
              })}
            </p>
          </div>

          <div className="flex items-center justify-between mb-12 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
            </div>
            {[1, 2, 3, 4].map((currentStep) => (
              <div
                key={currentStep}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-4 shadow-sm transition-all duration-300 bg-white ${
                  currentStep < step
                    ? "border-primary text-primary"
                    : currentStep === step
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 text-slate-400"
                }`}
              >
                {currentStep < step ? <Check className="h-6 w-6" /> : currentStep}
              </div>
            ))}
          </div>

          <Card className="p-4 sm:p-6 md:p-8 shadow-xl border-0">
            {errors.form && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm">{errors.form}</p>
              </div>
            )}

            {step < 4 ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {step === 1 && (
                  <div className="space-y-5">
                    <h3 className="text-xl font-bold font-serif border-b border-slate-100 pb-3 mb-6 text-slate-800">
                      {t({ uz: "1. Asosiy ma'lumotlar", en: "1. Basic information", ru: "1. Основная информация" })}
                    </h3>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-slate-700">
                        {t({ uz: "Asar nomi", en: "Work title", ru: "Название работы" })}
                      </label>
                      <Input
                        value={formData.title}
                        onChange={(event) => setFieldValue("title", event.target.value)}
                        placeholder={t({
                          uz: "Masalan: Oliy matematika asoslari",
                          en: "Example: Fundamentals of Higher Mathematics",
                          ru: "Например: Основы высшей математики",
                        })}
                        className="bg-slate-50"
                      />
                      {renderFieldError("title")}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-slate-700">
                        {t({
                          uz: "Annotatsiya (Qisqacha mazmuni)",
                          en: "Abstract (short summary)",
                          ru: "Аннотация (краткое содержание)",
                        })}
                      </label>
                      <Textarea
                        value={formData.abstract}
                        onChange={(event) => setFieldValue("abstract", event.target.value)}
                        placeholder={t({
                          uz: "Asar nima haqida...",
                          en: "Describe what the work is about...",
                          ru: "Опишите, о чем эта работа...",
                        })}
                        className="min-h-[150px] bg-slate-50"
                      />
                      {renderFieldError("abstract")}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700">
                          {t({
                            uz: "Kalit so'zlar (vergul bilan ajrating)",
                            en: "Keywords (separate with commas)",
                            ru: "Ключевые слова (через запятую)",
                          })}
                        </label>
                        <Input
                          value={formData.keywords}
                          onChange={(event) => setFieldValue("keywords", event.target.value)}
                          placeholder={t({
                            uz: "matematika, fizika, teoremalar",
                            en: "mathematics, physics, theorems",
                            ru: "математика, физика, теоремы",
                          })}
                          className="bg-slate-50"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {t({
                            uz: "Maksimal 10 ta kalit so'z.",
                            en: "Use no more than 10 keywords.",
                            ru: "Укажите не более 10 ключевых слов.",
                          })}
                        </p>
                        {renderFieldError("keywords")}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700">
                          {t({ uz: "Asar tili", en: "Work language", ru: "Язык работы" })}
                        </label>
                        <Select
                          value={formData.language}
                          onChange={(event) => setFieldValue("language", event.target.value)}
                          className="bg-slate-50"
                        >
                          <option value="uz">{t({ uz: "O'zbek tili", en: "Uzbek", ru: "Узбекский" })}</option>
                          <option value="ru">{t({ uz: "Rus tili", en: "Russian", ru: "Русский" })}</option>
                          <option value="en">{t({ uz: "Ingliz tili", en: "English", ru: "Английский" })}</option>
                        </Select>
                      </div>
                    </div>
                    {renderStepActions()}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <h3 className="text-xl font-bold font-serif border-b border-slate-100 pb-3 mb-6 text-slate-800">
                      {t({
                        uz: "2. Yo'nalish va kafedra",
                        en: "2. Direction and department",
                        ru: "2. Направление и кафедра",
                      })}
                    </h3>
                    <div>
                      <label className="block text-sm font-medium mb-3 text-slate-700">
                        {t({ uz: "Ilmiy yo'nalish", en: "Scientific direction", ru: "Научное направление" })}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {scientificDirections.map((direction) => (
                          <button
                            type="button"
                            key={direction}
                            onClick={() => setFieldValue("scientificDirection", direction)}
                            className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${
                              formData.scientificDirection === direction
                                ? "border-primary bg-primary/5 text-primary shadow-sm"
                                : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                            }`}
                          >
                            <span className="font-medium text-sm">{direction}</span>
                          </button>
                        ))}
                      </div>
                      {renderFieldError("scientificDirection")}
                    </div>
                    <div className="mt-8">
                      <label className="block text-sm font-medium mb-1.5 text-slate-700">
                        {t({ uz: "Tegishli kafedra", en: "Responsible department", ru: "Ответственная кафедра" })}
                      </label>
                      <Select
                        value={formData.departmentId}
                        onChange={(event) => setFieldValue("departmentId", event.target.value)}
                        className="bg-slate-50"
                      >
                        <option value="">
                          {t({ uz: "Kafedrani tanlang...", en: "Select a department...", ru: "Выберите кафедру..." })}
                        </option>
                        {departments?.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </Select>
                      {renderFieldError("departmentId")}
                    </div>
                    {renderStepActions()}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <h3 className="text-xl font-bold font-serif border-b border-slate-100 pb-3 mb-6 text-slate-800">
                      {t({ uz: "3. Adabiyot turi", en: "3. Literature type", ru: "3. Тип литературы" })}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {literatureOptions.map((type) => (
                        <button
                          type="button"
                          key={type.id}
                          onClick={() => setFieldValue("literatureType", type.id)}
                          className={`cursor-pointer flex flex-col p-5 rounded-xl border-2 text-left transition-all ${
                            formData.literatureType === type.id
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20 ring-offset-2 shadow-sm"
                              : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <span className="font-bold text-lg mb-1 text-slate-800">{type.label}</span>
                          <span className="text-sm text-slate-500">{type.desc}</span>
                        </button>
                      ))}
                    </div>
                    {renderFieldError("literatureType")}
                    {renderStepActions()}
                  </div>
                )}
              </div>
            ) : (
              <div className="min-w-0 space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-2xl font-bold font-serif text-slate-800">
                      {t({
                        uz: "4. Yakuniy tekshiruv va hujjatlarni yuklash",
                        en: "4. Final review and document upload",
                        ru: "4. Финальная проверка и загрузка документов",
                      })}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 break-words">
                      {t({
                        uz: "Ma'lumotlarni tekshiring, barcha majburiy fayllarni biriktiring va yakuniy yuborishni tasdiqlang.",
                        en: "Review the information, attach all required files, and confirm the final submission.",
                        ru: "Проверьте данные, прикрепите все обязательные файлы и подтвердите отправку.",
                      })}
                    </p>
                  </div>
                  {!submissionId && (
                    <Button type="button" variant="outline" onClick={handleBack} className="w-full md:w-auto shrink-0">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t({
                        uz: "Oldingi bosqichga qaytish",
                        en: "Return to previous step",
                        ru: "Вернуться к предыдущему шагу",
                      })}
                    </Button>
                  )}
                </div>

                <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                  <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-4">
                      {t({ uz: "Yuboriladigan ma'lumotlar", en: "Submission details", ru: "Данные для отправки" })}
                    </h4>
                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                      {summaryItems.map((item) => (
                        <div key={item.label} className="min-w-0 rounded-xl bg-white p-4 border border-slate-200">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800 break-words">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 min-w-0 rounded-xl bg-white p-4 border border-slate-200">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t({ uz: "Annotatsiya", en: "Abstract", ru: "Аннотация" })}
                      </p>
                      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap break-words">
                        {formData.abstract || t({ uz: "Kiritilmagan", en: "Not provided", ru: "Не указано" })}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-4">
                      {t({ uz: "Majburiy hujjatlar", en: "Required documents", ru: "Обязательные документы" })}
                    </h4>
                    <div className="space-y-3">
                      {requiredDocs.map((doc) => {
                        const file = files[doc.type];
                        const status = uploadProgress[doc.type];

                        return (
                          <div
                            key={doc.type}
                            className={`min-w-0 rounded-xl border p-4 flex flex-col gap-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                              file
                                ? "border-primary/30 bg-primary/5"
                                : "border-dashed border-slate-300 bg-slate-50"
                            }`}
                          >
                            <div className="flex w-full items-center gap-3 min-w-0">
                              <div
                                className={`shrink-0 p-3 rounded-lg ${
                                  file ? "bg-primary text-white shadow-sm" : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                <FileType className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-slate-800 break-words">{doc.label}</p>
                                <p className="text-xs text-slate-500 break-words mt-0.5">
                                  {file
                                    ? `${file.name} - ${(file.size / 1024 / 1024).toFixed(1)} MB`
                                    : t({
                                        uz: "PDF, DOC yoki DOCX formatida",
                                        en: "PDF, DOC, or DOCX format",
                                        ru: "Формат PDF, DOC или DOCX",
                                      })}
                                </p>
                              </div>
                            </div>
                            <div className="w-full shrink-0 sm:w-auto">
                              {status === "done" ? (
                                <CheckCircle className="h-6 w-6 text-emerald-500" />
                              ) : status === "uploading" ? (
                                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                              ) : (
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(event) =>
                                      handleFileSelect(doc.type, event.target.files?.[0] || null)
                                    }
                                  />
                                  <div className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-colors px-4 py-2 rounded-lg text-sm font-medium shadow-sm text-center sm:w-auto">
                                    {file
                                      ? t({ uz: "Almashtirish", en: "Replace", ru: "Заменить" })
                                      : t({ uz: "Tanlash", en: "Select", ru: "Выбрать" })}
                                  </div>
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {renderFieldError("files")}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    {allFilesSelected
                      ? t({
                          uz: "Barcha hujjatlar tayyor. Yakuniy yuborishni boshlashingiz mumkin.",
                          en: "All documents are ready. You can start the final submission.",
                          ru: "Все документы готовы. Можно выполнить финальную отправку.",
                        })
                      : t({
                          uz: "Yakuniy yuborishdan oldin barcha majburiy hujjatlarni biriktiring.",
                          en: "Attach all required documents before final submission.",
                          ru: "Перед финальной отправкой прикрепите все обязательные документы.",
                        })}
                  </p>
                  <Button
                    size="lg"
                    onClick={handleFinalSubmit}
                    disabled={!allFilesSelected || isSubmitting || uploadMutation.isPending || createMutation.isPending}
                    className="w-full sm:w-auto shadow-xl shadow-primary/30 text-lg px-8 h-14"
                  >
                    <UploadCloud className="mr-3 h-6 w-6" />
                    {isSubmitting
                      ? t({ uz: "Yuborilmoqda...", en: "Submitting...", ru: "Отправка..." })
                      : t({ uz: "Yakuniy yuborish", en: "Submit final version", ru: "Отправить окончательно" })}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
