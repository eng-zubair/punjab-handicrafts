import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Application = {
  id: string;
  programId: string;
  status: string;
  createdAt: string;
  acceptedAt?: string | null;
  enrolledAt?: string | null;
  completedAt?: string | null;
};

type Program = { id: string; title: string; durationWeeks: number };

type Progress = { id: string; applicationId: string; milestones?: any; completionPercent: number; attendancePercent: number; grade?: string | null; updatedAt: string };

type Work = { id: string; title: string; description?: string | null; amount: string; status: string; assignedAt: string; completedAt?: string | null; approvedAt?: string | null };

export default function TrainingDashboard() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  if (!isAuthenticated) setLocation("/training/apply");

  const { data: apps = [] } = useQuery<Application[]>({ queryKey: ["/api/training/applications/me"], refetchInterval: 5000 });
  const { data: programs = [] } = useQuery<Program[]>({ queryKey: ["/api/training/programs"] });
  const { data: work = [] } = useQuery<Work[]>({ queryKey: ["/api/training/work/me"], refetchInterval: 5000 });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/training/work/${id}/complete`, {});
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/training/work/me"] }),
  });

  const progTitle = (id: string) => programs.find(p => p.id === id)?.title || "";

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trainee Dashboard</h1>
            <p className="text-muted-foreground">Track applications, progress, and artisan work</p>
          </div>
          <Link href="/vendor/register"><Button variant="secondary">Register as Vendor</Button></Link>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">Applications</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {apps.length === 0 ? (<p className="text-muted-foreground">No applications</p>) : apps.map(a => (
                <div key={a.id} className="border rounded p-3">
                  <div className="font-medium">{progTitle(a.programId)}</div>
                  <div className="text-muted-foreground">Status: {a.status}</div>
                  <Link href={`/training/progress/${a.id}`}><Button variant="ghost" size="sm">View Progress</Button></Link>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Artisan Work & Payments</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {work.length === 0 ? (<p className="text-muted-foreground">No assigned work</p>) : work.map(w => (
                <div key={w.id} className="border rounded p-3">
                  <div className="font-medium">{w.title}</div>
                  <div className="text-muted-foreground">PKR {parseFloat(String(w.amount)).toLocaleString()} • {w.status}</div>
                  {w.status === 'pending' ? (
                    <Button size="sm" onClick={() => completeMutation.mutate(w.id)} disabled={completeMutation.isPending}>Mark Completed</Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}

