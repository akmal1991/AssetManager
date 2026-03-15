import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetAdminStats, useGetUsers, useUpdateUserRole } from "@workspace/api-client-react";
import { Card, PageTransition, LoadingSpinner, Badge, Select } from "@/components/ui/shared";
import { Users, FileText, CheckCircle, PieChart, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: users, isLoading: usersLoading, refetch } = useGetUsers();
  const updateRoleMutation = useUpdateUserRole();
  const { toast } = useToast();

  const handleRoleChange = async (id: number, role: any) => {
    try {
      await updateRoleMutation.mutateAsync({ id, data: { role } });
      toast({ title: "Muvaffaqiyatli", description: "Foydalanuvchi roli o'zgardi" });
      refetch();
    } catch (e) {
      toast({ title: "Xatolik", description: "Rolni o'zgartirishda xatolik", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold text-foreground">Boshqaruv Paneli (Admin)</h2>
            <p className="text-muted-foreground mt-1">Tizim holati va foydalanuvchilarni boshqarish</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>

        {statsLoading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatBox label="Jami foydalanuvchilar" value={stats?.totalUsers || 0} icon={Users} color="blue" />
            <StatBox label="Jami ekspertlar" value={stats?.totalReviewers || 0} icon={PieChart} color="purple" />
            <StatBox label="Jami ilmiy ishlar" value={stats?.totalSubmissions || 0} icon={FileText} color="emerald" />
            <StatBox label="Nashr qilingan" value={stats?.published || 0} icon={CheckCircle} color="amber" />
          </div>
        )}

        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="px-6 py-5 border-b border-border/50 bg-muted/30">
            <h3 className="text-xl font-bold font-serif text-foreground">Foydalanuvchilar ro'yxati</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-xs tracking-wider">
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
                ) : users?.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{user.fullName}</td>
                    <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4">
                      <p className="text-foreground">{user.departmentName || '-'}</p>
                      <p className="text-xs text-muted-foreground">{user.scientificDegree !== 'none' ? user.scientificDegree : ''} {user.position?.replace('_', ' ')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'editor' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'reviewer' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Select 
                        className="h-9 py-1 w-32 ml-auto text-xs" 
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
      </PageTransition>
    </DashboardLayout>
  );
}

function StatBox({ label, value, icon: Icon, color }: any) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };
  
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${colors[color as keyof typeof colors]}`}>
      <div className="p-3 bg-white/50 rounded-xl backdrop-blur-sm shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-3xl font-bold font-serif">{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mt-1">{label}</p>
      </div>
    </div>
  );
}
