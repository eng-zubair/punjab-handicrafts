import { AdminDashboard } from "./AdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AdminTraining() {
  const { toast } = useToast();
  const { data: centers = [] } = useQuery<any[]>({ queryKey: ["/api/training/centers"] });
  const { data: programs = [] } = useQuery<any[]>({ queryKey: ["/api/training/programs"] });
  const { data: applications = [] } = useQuery<any[]>({ queryKey: ["/api/admin/training/applications", { programId: programs[0]?.id || "" }], enabled: programs.length > 0 });
  const { data: works = [] } = useQuery<any[]>({ queryKey: ["/api/admin/training/work"] });

  const [centerForm, setCenterForm] = useState({ name: "", district: "", capacity: "" });
  const [programForm, setProgramForm] = useState({ centerId: "", title: "", durationWeeks: "", schedule: "" });

  const createCenter = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/training/centers", { name: centerForm.name, district: centerForm.district, capacity: Number(centerForm.capacity || 0) });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/training/centers"] }); toast({ title: "Center created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const createProgram = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/training/programs", { centerId: programForm.centerId, title: programForm.title, durationWeeks: Number(programForm.durationWeeks || 0), schedule: programForm.schedule });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/training/programs"] }); toast({ title: "Program created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const updateAppStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/admin/training/applications/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/training/applications"] }); toast({ title: "Application updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const approveWork = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/admin/training/work/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/training/work"] }); toast({ title: "Work approved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  return (
    <AdminDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Training Management</h1>
          <p className="text-muted-foreground">Centers, programs, applications, progress, and payouts</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">Create Center</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>Name</Label><Input value={centerForm.name} onChange={e => setCenterForm({ ...centerForm, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>District</Label><Input value={centerForm.district} onChange={e => setCenterForm({ ...centerForm, district: e.target.value })} /></div>
              <div className="space-y-2"><Label>Capacity</Label><Input value={centerForm.capacity} onChange={e => setCenterForm({ ...centerForm, capacity: e.target.value })} /></div>
              <Button onClick={() => createCenter.mutate()} disabled={createCenter.isPending}>{createCenter.isPending ? "Saving..." : "Save"}</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Create Program</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Center</Label>
                <Select value={programForm.centerId} onValueChange={v => setProgramForm({ ...programForm, centerId: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select center" /></SelectTrigger>
                  <SelectContent>
                    {centers.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Title</Label><Input value={programForm.title} onChange={e => setProgramForm({ ...programForm, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Duration Weeks</Label><Input value={programForm.durationWeeks} onChange={e => setProgramForm({ ...programForm, durationWeeks: e.target.value })} /></div>
              <div className="space-y-2"><Label>Schedule</Label><Input value={programForm.schedule} onChange={e => setProgramForm({ ...programForm, schedule: e.target.value })} /></div>
              <Button onClick={() => createProgram.mutate()} disabled={createProgram.isPending}>{createProgram.isPending ? "Saving..." : "Save"}</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">Applications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {applications.length === 0 ? (<p className="text-muted-foreground">No applications</p>) : applications.map((a: any) => (
                <div key={a.id} className="border rounded p-3 text-sm">
                  <div className="font-medium">{a.userId?.slice(0,8)}</div>
                  <div className="text-muted-foreground">{a.status}</div>
                  <div className="flex gap-2 mt-2">
                    {['accepted','enrolled','completed'].map(s => (
                      <Button key={s} variant="outline" size="sm" onClick={() => updateAppStatus.mutate({ id: a.id, status: s })}>{s}</Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Artisan Work</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {works.length === 0 ? (<p className="text-muted-foreground">No work</p>) : works.map((w: any) => (
                <div key={w.id} className="border rounded p-3 text-sm">
                  <div className="font-medium">{w.title}</div>
                  <div className="text-muted-foreground">PKR {parseFloat(String(w.amount)).toLocaleString()} • {w.status}</div>
                  {w.status !== 'approved' ? (<Button variant="outline" size="sm" onClick={() => approveWork.mutate(w.id)}>Approve & Create Payout</Button>) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminDashboard>
  );
}

