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
import { LITERATURE_TYPES } from "@/lib/utils";

const REQUIRED_DOCS = [
  { type: "main_document", label: "Asosiy hujjat (Qo'lyozma)" },
  { type: "internal_review", label: "Ichki taqriz" },
  { type: "external_review", label: "Tashqi taqriz" },
  { type: "plagiarism_report", label: "Antiplagiat ma'lumotnomasi" },
  { type: "curriculum", label: "O'quv reja" },
  { type: "syllabus", label: "Sillabus / O'quv dasturi" },
] as const;

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

  const { data: departments } = useGetDepartments();
  const { data: directionsData } = useGetScientificDirections();
  const createMutation = useCreateSubmission();
  const uploadMutation = useUploadDocument();

  const scientificDirections = directionsData?.map((direction) => direction.name) ?? [];
  const trimmedKeywords = useMemo(
    () => formData.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    [formData.keywords],
  );

  const summaryItems = [
    { label: "Asar nomi", value: formData.title || "Kiritilmagan" },
    {
      label: "Til",
      value:
        formData.language === "uz"
          ? "O'zbek tili"
          : formData.language === "ru"
            ? "Rus tili"
            : "Ingliz tili",
    },
    {
      label: "Ilmiy yo'nalish",
      value: formData.scientificDirection || "Tanlanmagan",
    },
    {
      label: "Kafedra",
      value:
        departments?.find((department) => String(department.id) === formData.departmentId)?.name ??
        "Tanlanmagan",
    },
    {
      label: "Adabiyot turi",
      value: formData.literatureType
        ? LITERATURE_TYPES[formData.literatureType as keyof typeof LITERATURE_TYPES]
        : "Tanlanmagan",
    },
    {
      label: "Kalit so'zlar",
      value: trimmedKeywords.length > 0 ? trimmedKeywords.join(", ") : "Kiritilmagan",
    },
  ];

  const setFieldValue = (field: keyof FormDataState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined, files: undefined }));
  };

  const validateStep = (stepNumber: number) => {
    const nextErrors: WizardErrors = {};

    if (stepNumber === 1) {
      if (!formData.title.trim()) nextErrors.title = "Asar nomini kiriting.";
      if (formData.title.trim().length > 255) nextErrors.title = "Asar nomi juda uzun.";
      if (!formData.abstract.trim()) nextErrors.abstract = "Annotatsiyani kiriting.";
      if (formData.abstract.trim().length < 20) {
        nextErrors.abstract = "Annotatsiya kamida 20 ta belgidan iborat bo'lsin.";
      }
      if (trimmedKeywords.length > 10) {
        nextErrors.keywords = "Kalit so'zlar soni 10 tadan oshmasin.";
      }
    }

    if (stepNumber === 2) {
      if (!formData.scientificDirection) {
        nextErrors.scientificDirection = "Ilmiy yo'nalishni tanlang.";
      }
      if (!formData.departmentId) {
        nextErrors.departmentId = "Kafedrani tanlang.";
      }
    }

    if (stepNumber === 3 && !formData.literatureType) {
      nextErrors.literatureType = "Adabiyot turini tanlang.";
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateFiles = () => {
    const missingDocs = REQUIRED_DOCS.filter((doc) => !files[doc.type]);
    if (missingDocs.length > 0) {
      setErrors((prev) => ({
        ...prev,
        files: `Quyidagi hujjatlarni biriktiring: ${missingDocs
          .map((doc) => doc.label)
          .join(", ")}`,
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, files: undefined }));
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      toast({
        title: "Tekshirib chiqing",
        description: "Majburiy maydonlarni to'g'ri to'ldiring.",
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
        title: "Noto'g'ri format",
        description: "Faqat PDF, DOC yoki DOCX fayllarini yuklang.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "Fayl juda katta",
        description: "Har bir fayl hajmi 100 MB dan oshmasligi kerak.",
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
        title: "Ma'lumot yetarli emas",
        description: "Barcha bosqichlarni to'liq yakunlang.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const currentSubmissionId = await ensureSubmissionExists();

      for (const doc of REQUIRED_DOCS) {
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
        title: "Muvaffaqiyatli yuborildi",
        description: "Ilmiy ish va barcha hujjatlar ekspertiza uchun saqlandi.",
      });
      setLocation("/dashboard/author");
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Yuborish jarayonida xatolik yuz berdi. Qayta urinib ko'ring.";

      setErrors((prev) => ({ ...prev, form: message }));
      setUploadProgress((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([key, value]) => [key, value === "uploading" ? "pending" : value]),
        ),
      );
      toast({ title: "Yuborib bo'lmadi", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allFilesSelected = REQUIRED_DOCS.every((doc) => Boolean(files[doc.type]));

  const renderFieldError = (field: keyof WizardErrors) =>
    errors[field] ? <p className="mt-2 text-sm text-red-600">{errors[field]}</p> : null;

  const renderStepActions = () => (
    <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
      <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1} className="w-32">
        <ArrowLeft className="mr-2 h-4 w-4" /> Orqaga
      </Button>
      <Button type="button" onClick={handleNext} className="w-48 shadow-lg shadow-primary/20">
        Keyingisi
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="max-w-4xl mx-auto py-8">
          <div className="mb-10">
            <h2 className="text-3xl font-serif font-bold text-primary">Yangi ilmiy ish yuborish</h2>
            <p className="text-muted-foreground mt-2">
              To'liq ma'lumotlarni kiriting va hujjatlarni biriktiring.
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

          <Card className="p-8 shadow-xl border-0">
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
                      1. Asosiy ma'lumotlar
                    </h3>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-slate-700">Asar nomi</label>
                      <Input
                        value={formData.title}
                        onChange={(event) => setFieldValue("title", event.target.value)}
                        placeholder="Masalan: Oliy matematika asoslari"
                        className="bg-slate-50"
                      />
                      {renderFieldError("title")}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-slate-700">
                        Annotatsiya (Qisqacha mazmuni)
                      </label>
                      <Textarea
                        value={formData.abstract}
                        onChange={(event) => setFieldValue("abstract", event.target.value)}
                        placeholder="Asar nima haqida..."
                        className="min-h-[150px] bg-slate-50"
                      />
                      {renderFieldError("abstract")}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700">
                          Kalit so'zlar (vergul bilan ajrating)
                        </label>
                        <Input
                          value={formData.keywords}
                          onChange={(event) => setFieldValue("keywords", event.target.value)}
                          placeholder="matematika, fizika, teoremalar"
                          className="bg-slate-50"
                        />
                        <p className="mt-2 text-xs text-slate-500">Maksimal 10 ta kalit so'z.</p>
                        {renderFieldError("keywords")}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700">Asar tili</label>
                        <Select
                          value={formData.language}
                          onChange={(event) => setFieldValue("language", event.target.value)}
                          className="bg-slate-50"
                        >
                          <option value="uz">O'zbek tili</option>
                          <option value="ru">Rus tili</option>
                          <option value="en">Ingliz tili</option>
                        </Select>
                      </div>
                    </div>
                    {renderStepActions()}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <h3 className="text-xl font-bold font-serif border-b border-slate-100 pb-3 mb-6 text-slate-800">
                      2. Yo'nalish va Kafedra
                    </h3>
                    <div>
                      <label className="block text-sm font-medium mb-3 text-slate-700">Ilmiy yo'nalish</label>
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
                      <label className="block text-sm font-medium mb-1.5 text-slate-700">Tegishli Kafedra</label>
                      <Select
                        value={formData.departmentId}
                        onChange={(event) => setFieldValue("departmentId", event.target.value)}
                        className="bg-slate-50"
                      >
                        <option value="">Kafedrani tanlang...</option>
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
                      3. Adabiyot turi
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        {
                          id: "darslik",
                          label: "Darslik",
                          desc: "Oliy ta'lim uchun mo'ljallangan asosiy darslik",
                        },
                        {
                          id: "oquv_qollanma",
                          label: "O'quv qo'llanma",
                          desc: "Darslikni to'ldiruvchi qo'shimcha manba",
                        },
                        {
                          id: "monografiya",
                          label: "Monografiya",
                          desc: "Chuqur ilmiy tadqiqot ishi",
                        },
                        {
                          id: "oquv_uslubiy_qollanma",
                          label: "O'quv-uslubiy qo'llanma",
                          desc: "Amaliy mashg'ulotlar uchun",
                        },
                        {
                          id: "uslubiy_korsatma",
                          label: "Uslubiy ko'rsatma",
                          desc: "Laboratoriya va mustaqil ishlar uchun",
                        },
                      ].map((type) => (
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
              <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold font-serif text-slate-800">
                      4. Yakuniy tekshiruv va hujjatlarni yuklash
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Ma'lumotlarni tekshiring, barcha majburiy fayllarni biriktiring va yakuniy yuborishni tasdiqlang.
                    </p>
                  </div>
                  {!submissionId && (
                    <Button type="button" variant="outline" onClick={handleBack} className="w-full md:w-auto">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Oldingi bosqichga qaytish
                    </Button>
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-4">
                      Yuboriladigan ma'lumotlar
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {summaryItems.map((item) => (
                        <div key={item.label} className="rounded-xl bg-white p-4 border border-slate-200">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl bg-white p-4 border border-slate-200">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Annotatsiya</p>
                      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                        {formData.abstract || "Kiritilmagan"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-4">
                      Majburiy hujjatlar
                    </h4>
                    <div className="space-y-3">
                      {REQUIRED_DOCS.map((doc) => {
                        const file = files[doc.type];
                        const status = uploadProgress[doc.type];

                        return (
                          <div
                            key={doc.type}
                            className={`rounded-xl border p-4 flex items-center justify-between gap-3 transition-colors ${
                              file
                                ? "border-primary/30 bg-primary/5"
                                : "border-dashed border-slate-300 bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`p-3 rounded-lg ${
                                  file ? "bg-primary text-white shadow-sm" : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                <FileType className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-slate-800">{doc.label}</p>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {file
                                    ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(1)} MB`
                                    : "PDF yoki DOCX formatida"}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0">
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
                                  <div className="bg-white border border-slate-200 text-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-colors px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                                    {file ? "Almashtirish" : "Tanlash"}
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
                      ? "Barcha hujjatlar tayyor. Yakuniy yuborishni boshlashingiz mumkin."
                      : "Yakuniy yuborishdan oldin barcha majburiy hujjatlarni biriktiring."}
                  </p>
                  <Button
                    size="lg"
                    onClick={handleFinalSubmit}
                    disabled={!allFilesSelected || isSubmitting || uploadMutation.isPending || createMutation.isPending}
                    className="w-full sm:w-auto shadow-xl shadow-primary/30 text-lg px-8 h-14"
                  >
                    <UploadCloud className="mr-3 h-6 w-6" />
                    {isSubmitting ? "Yuborilmoqda..." : "Yakuniy yuborish"}
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
