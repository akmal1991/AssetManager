import React, { useState } from "react";
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
  useDeleteScientificDirection
} from "@workspace/api-client-react";
import { Card, PageTransition, LoadingSpinner, Badge, Select, Button, Input } from "@/components/ui/shared";
import { Users, FileText, CheckCircle, PieChart, Shield, Search, Trash2, Plus, Activity, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("stats");
  const [userSearch, setUserSearch] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDirName, setNewDirName] = useState("");

  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useGetUsers();
  const { data: departments, refetch: refetchDepts } = useGetDepartments();
  const { data: directions, refetch: refetchDirs } = useGetScientificDirections();

  const updateRoleMutation = useUpdateUserRole();
  const createDeptMutation = useCreateDepartment();
  const deleteDeptMutation = useDeleteDepartment();
  const createDirMutation = useCreateScientificDirection();
  const deleteDirMutation = useDeleteScientificDirection();

  const { toast } = useToast();

  const handleRoleChange = async (id: number, role: any) => {
    try {
      await updateRoleMutation.mutateAsync({ id, data: { role } });
      toast({ title: "Muvaffaqiyatli", description: "Foydalanuvchi roli o'zgardi" });
      refetchUsers();
    } catch (e) {
      toast({ title: "Xatolik", description: "Rolni o'zgartirishda xatolik", variant: "destructive" });
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;
    try {
      await createDeptMutation.mutateAsync({ data: { name: newDeptName } });
      setNewDeptName("");
      refetchDepts();
      toast({ title: "Muvaffaqiyatli", description: "Kafedra qo'shildi" });
    } catch (e) {
      toast({ title: "Xatolik", description: "Kafedra qo'shishda xatolik", variant: "destructive" });
    }
  };

  const handleDeleteDept = async (id: number) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDeptMutation.mutateAsync({ id });
      refetchDepts();
      toast({ title: "Muvaffaqiyatli", description: "Kafedra o'chirildi" });
    } catch (e) {
      toast({ title: "Xatolik", description: "O'chirishda xatolik", variant: "destructive" });
    }
  };

  const handleCreateDir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirName) return;
    try {
      await createDirMutation.mutateAsync({ data: { name: newDirName } });
      setNewDirName("");
      refetchDirs();
      toast({ title: "Muvaffaqiyatli", description: "Yo'nalish qo'shildi" });
    } catch (e) {
      toast({ title: "Xatolik", description: "Yo'nalish qo'shishda xatolik", variant: "destructive" });
    }
  };

  const handleDeleteDir = async (id: number) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDirMutation.mutateAsync({ id });
      refetchDirs();
      toast({ title: "Muvaffaqiyatli", description: "Yo'nalish o'chirildi" });
    } catch (e) {
      toast({ title: "Xatolik", description: "O'chirishda xatolik", variant: "destructive" });
    }
  };

  const filteredUsers = users?.filter(u => 
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const chartData = [
    { name: 'Yuborilgan', count: stats?.submissionsByStatus?.submitted || 0 },
    { name: 'Jarayonda', count: stats?.submissionsByStatus?.under_review || 0 },
    { name: 'Tuzatish', count: stats?.submissionsByStatus?.revision_required || 0 },
    { name: 'Qabul', count: stats?.submissionsByStatus?.accepted || 0 },
    { name: 'Rad', count: stats?.submissionsByStatus?.rejected || 0 },
    { name: 'Nashr', count: stats?.submissionsByStatus?.published || 0 },
  ];

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold text-primary">Boshqaruv Paneli</h2>
            <p className="text-muted-foreground mt-1">Tizim holati va sozlamalari</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="flex gap-2 border-b border-border/50 mb-6 overflow-x-auto pb-2">
          {[
            { id: "stats", label: "Statistika", icon: PieChart },
            { id: "users", label: "Foydalanuvchilar", icon: Users },
            { id: "dicts", label: "Lug'atlar", icon: BookOpen },
            { id: "logs", label: "Tizim loglari", icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "stats" && (
          <div className="space-y-8 animate-in fade-in">
            {statsLoading ? <LoadingSpinner /> : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatBox label="Jami foydalanuvchilar" value={stats?.totalUsers || 0} icon={Users} color="blue" />
                  <StatBox label="Jami ekspertlar" value={stats?.totalReviewers || 0} icon={Shield} color="purple" />
                  <StatBox label="Jami arizalar" value={stats?.totalSubmissions || 0} icon={FileText} color="emerald" />
                  <StatBox label="Nashr qilingan" value={stats?.published || 0} icon={CheckCircle} color="amber" />
                </div>
                
                <Card className="p-6">
                  <h3 className="text-lg font-bold font-serif mb-6">Arizalar holati bo'yicha</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="count" fill="#1e3a8a" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <Card className="overflow-hidden border-0 shadow-xl animate-in fade-in">
            <div className="px-6 py-5 border-b border-border/50 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-bold font-serif text-foreground">Foydalanuvchilar ro'yxati</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Izlash..." 
                  className="pl-9 w-full sm:w-[300px] h-10"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 font-semibold">F.I.Sh</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Kafedra / Daraja</th>
                    <th className="px-6 py-4 font-semibold">Joriy Rol</th>
                    <th className="px-6 py-4 font-semibold text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {usersLoading ? (
                    <tr><td colSpan={5} className="p-8 text-center"><LoadingSpinner /></td></tr>
                  ) : filteredUsers?.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors bg-white">
                      <td className="px-6 py-4 font-medium text-slate-900">{user.fullName}</td>
                      <td className="px-6 py-4 text-slate-500">{user.email}</td>
                      <td className="px-6 py-4">
                        <p className="text-slate-900">{user.departmentName || '-'}</p>
                        <p className="text-xs text-slate-500">{user.scientificDegree !== 'none' ? user.scientificDegree : ''} {user.position?.replace('_', ' ')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          user.role === 'editor' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          user.role === 'reviewer' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          'bg-slate-100 text-slate-800 border-slate-200'
                        }>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Select 
                          className="h-9 py-1 w-32 ml-auto text-xs bg-slate-50" 
                          value={user.role} 
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <option value="author">Author</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "dicts" && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
            {/* Departments */}
            <Card className="overflow-hidden shadow-lg border-0 bg-white">
              <div className="px-6 py-5 border-b border-border/50 bg-slate-50 flex justify-between items-center">
                <h3 className="text-lg font-bold font-serif text-slate-900">Kafedralar</h3>
                <Badge variant="outline" className="bg-white">{departments?.length || 0}</Badge>
              </div>
              <div className="p-6">
                <form onSubmit={handleCreateDept} className="flex gap-2 mb-6">
                  <Input 
                    placeholder="Yangi kafedra nomi..." 
                    value={newDeptName} 
                    onChange={e => setNewDeptName(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newDeptName || createDeptMutation.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Qo'shish
                  </Button>
                </form>
                <div className="max-h-[400px] overflow-y-auto border rounded-xl divide-y">
                  {departments?.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-medium">{d.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteDept(d.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Scientific Directions */}
            <Card className="overflow-hidden shadow-lg border-0 bg-white">
              <div className="px-6 py-5 border-b border-border/50 bg-slate-50 flex justify-between items-center">
                <h3 className="text-lg font-bold font-serif text-slate-900">Ilmiy yo'nalishlar</h3>
                <Badge variant="outline" className="bg-white">{directions?.length || 0}</Badge>
              </div>
              <div className="p-6">
                <form onSubmit={handleCreateDir} className="flex gap-2 mb-6">
                  <Input 
                    placeholder="Yangi yo'nalish nomi..." 
                    value={newDirName} 
                    onChange={e => setNewDirName(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newDirName || createDirMutation.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Qo'shish
                  </Button>
                </form>
                <div className="max-h-[400px] overflow-y-auto border rounded-xl divide-y">
                  {directions?.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-medium">{d.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteDir(d.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="animate-in fade-in flex flex-col items-center justify-center p-16 text-center bg-white rounded-2xl shadow-sm border border-border/50">
            <Activity className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold font-serif text-slate-800">Tizim loglari tez orada...</h3>
            <p className="text-muted-foreground mt-2 max-w-md">Bu yerda tizimdagi barcha o'zgarishlar va foydalanuvchi harakatlari tarixi ko'rsatiladi.</p>
          </div>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}

function StatBox({ label, value, icon: Icon, color }: any) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  const iconColors = {
    blue: "text-blue-600 bg-blue-100",
    purple: "text-purple-600 bg-purple-100",
    emerald: "text-emerald-600 bg-emerald-100",
    amber: "text-amber-600 bg-amber-100",
  };
  
  return (
    <Card className="p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${iconColors[color as keyof typeof iconColors]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold font-sans text-slate-900 mb-1">{value}</p>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
    </Card>
  );
}
