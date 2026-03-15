import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useCreateSubmission, useUploadDocument, useUpdateSubmissionStatus, useGetDepartments, useGetScientificDirections } from "@workspace/api-client-react";
import { Button, Card, Input, Select, Textarea, PageTransition } from "@/components/ui/shared";
import { UploadCloud, CheckCircle, ArrowRight, ArrowLeft, FileType, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const REQUIRED_DOCS = [
  { type: "main_document", label: "Asosiy hujjat (Qo'lyozma)" },
  { type: "internal_review", label: "Ichki taqriz" },
  { type: "external_review", label: "Tashqi taqriz" },
  { type: "plagiarism_report", label: "Antiplagiat ma'lumotnomasi" },
  { type: "curriculum", label: "O'quv reja" },
  { type: "syllabus", label: "Sillabus / O'quv dasturi" },
];

export default function NewSubmissionWizard() {
  const [step, setStep] = useState(1);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: departments } = useGetDepartments();
  const { data: directionsData } = useGetScientificDirections();
  const SCIENTIFIC_DIRECTIONS = directionsData?.map(d => d.name) || [];

  const createMutation = useCreateSubmission();
  const uploadMutation = useUploadDocument();
  const updateStatusMutation = useUpdateSubmissionStatus();

  // Step 1 State
  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    language: "uz",
    departmentId: "",
    scientificDirection: "",
    literatureType: "",
    keywords: ""
  });

  // Step 4 State (Files)
  const [files, setFiles] = useState<Record<string, File>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'done'>>({});

  const handleCreateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    
    // Finalize Step 3 -> Create DB Record
    try {
      const result = await createMutation.mutateAsync({
        data: {
          title: formData.title,
          abstract: formData.abstract,
          language: formData.language,
          departmentId: Number(formData.departmentId),
          scientificDirection: formData.scientificDirection,
          literatureType: formData.literatureType as any,
          keywords: formData.keywords.split(",").map(k => k.trim()).filter(k => k),
        }
      });
      setSubmissionId(result.id);
      setStep(4);
      toast({ title: "Ma'lumotlar saqlandi", description: "Endi hujjatlarni yuklang" });
    } catch (err) {
      toast({ title: "Xatolik", description: "Ma'lumotni saqlashda xatolik", variant: "destructive" });
    }
  };

  const handleFileSelect = (type: string, file: File | null) => {
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));
      setUploadProgress(prev => ({ ...prev, [type]: 'pending' }));
    }
  };

  const handleUploadAll = async () => {
    if (!submissionId) return;
    
    const typesToUpload = Object.keys(files);
    let allSuccess = true;

    for (const type of typesToUpload) {
      if (uploadProgress[type] === 'done') continue;
      
      setUploadProgress(prev => ({ ...prev, [type]: 'uploading' }));
      try {
        await uploadMutation.mutateAsync({
          id: submissionId,
          data: { file: files[type], docType: type }
        });
        setUploadProgress(prev => ({ ...prev, [type]: 'done' }));
      } catch (err) {
        allSuccess = false;
        setUploadProgress(prev => ({ ...prev, [type]: 'pending' }));
        toast({ title: "Xatolik", description: `${type} yuklanmadi`, variant: "destructive" });
      }
    }

    if (allSuccess && typesToUpload.length === REQUIRED_DOCS.length) {
      // Mark as submitted
      await updateStatusMutation.mutateAsync({
        id: submissionId,
        data: { status: "submitted" }
      });
      toast({ title: "Muvaffaqiyatli", description: "Hujjat ekspertizaga yuborildi!" });
      setLocation("/dashboard/author");
    }
  };

  const allFilesSelected = Object.keys(files).length === REQUIRED_DOCS.length;

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="max-w-4xl mx-auto py-8">
          <div className="mb-10">
            <h2 className="text-3xl font-serif font-bold text-primary">Yangi ilmiy ish yuborish</h2>
            <p className="text-muted-foreground mt-2">To'liq ma'lumotlarni kiriting va hujjatlarni biriktiring.</p>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between mb-12 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full">
              <div 
                className="h-full bg-primary transition-all duration-500 rounded-full" 
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
            </div>
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s} 
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-4 shadow-sm transition-all duration-300 bg-white ${
                  s < step ? "border-primary text-primary" : 
                  s === step ? "border-primary bg-primary text-white" : 
                  "border-slate-200 text-slate-400"
                }`}
              >
                {s < step ? <Check className="h-6 w-6" /> : s}
              </div>
            ))}
          </div>

          <Card className="p-8 shadow-xl border-0">
            {step < 4 ? (
              <form onSubmit={handleCreateMetadata} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {step === 1 && (
                  <div className="space-y-5">
                    <h3 className="text-xl font-bold font-serif border-b border-slate-100 pb-3 mb-6 text-slate-800">1. Asosiy ma'lumotlar</h3>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-slate-700">Asar nomi</label>
                      <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Masalan: Oliy matematika asoslari" className="bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-slate-700">Annotatsiya (Qisqacha mazmuni)</label>
                      <Textarea required value={formData.abstract} onChange={e => setFormData({...formData, abstract: e.target.value})} placeholder="Asar nima haqida..." className="min-h-[150px] bg-slate-50" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700">Kalit so'zlar (vergul bilan ajrating)</label>
                        <Input value={formData.keywords} onChange={e => setFormData({...formData, keywords: e.target.value})} placeholder="matematika, fizika, teoremalar" className="bg-slate-50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700">Asar tili</label>
                        <Select required value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})} className="bg-slate-50">
                          <option value="uz">O'zbek tili</option>
                          <option value="ru">Rus tili</option>
                          <option value="en">Ingliz tili</option>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <h3 className="text-xl font-bold font-serif border-b border-slate-100 pb-3 mb-6 text-slate-800">2. Yo'nalish va Kafedra</h3>
                    <div>
                      <label className="block text-sm font-medium mb-3 text-slate-700">Ilmiy yo'nalish</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {SCIENTIFIC_DIRECTIONS.map(dir => (
                          <label key={dir} className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${formData.scientificDirection === dir ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'}`}>
                            <input type="radio" className="hidden" name="direction" value={dir} checked={formData.scientificDirection === dir} onChange={(e) => setFormData({...formData, scientificDirection: e.target.value})} required />
                            <span className="font-medium text-sm">{dir}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="mt-8">
                      <label className="block text-sm font-medium mb-1.5 text-slate-700">Tegishli Kafedra</label>
                      <Select required value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="bg-slate-50">
                        <option value="">Kafedrani tanlang...</option>
                        {departments?.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <h3 className="text-xl font-bold font-serif border-b border-slate-100 pb-3 mb-6 text-slate-800">3. Adabiyot turi</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { id: 'darslik', label: 'Darslik', desc: 'Oliy ta\'lim uchun mo\'ljallangan asosiy darslik' },
                        { id: 'oquv_qollanma', label: 'O\'quv qo\'llanma', desc: 'Darslikni to\'ldiruvchi qo\'shimcha manba' },
                        { id: 'monografiya', label: 'Monografiya', desc: 'Chuqur ilmiy tadqiqot ishi' },
                        { id: 'oquv_uslubiy_qollanma', label: 'O\'quv-uslubiy qo\'llanma', desc: 'Amaliy mashg\'ulotlar uchun' },
                        { id: 'uslubiy_korsatma', label: 'Uslubiy ko\'rsatma', desc: 'Laboratoriya va mustaqil ishlar uchun' }
                      ].map(type => (
                        <label key={type.id} className={`cursor-pointer flex flex-col p-5 rounded-xl border-2 transition-all ${formData.literatureType === type.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20 ring-offset-2 shadow-sm' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
                          <input type="radio" className="hidden" name="literatureType" value={type.id} checked={formData.literatureType === type.id} onChange={(e) => setFormData({...formData, literatureType: e.target.value})} required />
                          <span className="font-bold text-lg mb-1 text-slate-800">{type.label}</span>
                          <span className="text-sm text-slate-500">{type.desc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
                  <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1} className="w-32">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Orqaga
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} className="w-48 shadow-lg shadow-primary/20">
                    {step === 3 ? (createMutation.isPending ? "Saqlanmoqda..." : "Saqlash") : "Keyingisi"} 
                    {step < 3 && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                <h3 className="text-2xl font-bold font-serif text-center mb-8 text-slate-800">4. Hujjatlarni yuklash</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {REQUIRED_DOCS.map(doc => {
                    const file = files[doc.type];
                    const status = uploadProgress[doc.type];
                    return (
                      <div key={doc.type} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${file ? 'border-primary/30 bg-primary/5' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                        <div className="flex items-center gap-4 flex-1 overflow-hidden">
                          <div className={`p-3 rounded-lg ${file ? 'bg-primary text-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
                            <FileType className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-800">{doc.label}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {file ? file.name : "PDF yoki DOCX formatida"}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4 shrink-0">
                          {status === 'done' ? (
                            <CheckCircle className="h-6 w-6 text-emerald-500" />
                          ) : status === 'uploading' ? (
                            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                          ) : (
                            <label className="cursor-pointer">
                              <input 
                                type="file" 
                                className="hidden" 
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleFileSelect(doc.type, e.target.files?.[0] || null)}
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
                
                <div className="pt-8 border-t border-slate-100 mt-8 flex justify-end">
                  <Button 
                    size="lg" 
                    onClick={handleUploadAll} 
                    disabled={!allFilesSelected || uploadMutation.isPending || updateStatusMutation.isPending}
                    className="w-full sm:w-auto shadow-xl shadow-primary/30 text-lg px-8 h-14"
                  >
                    <UploadCloud className="mr-3 h-6 w-6" />
                    Barchasini yuklash va yuborish
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
