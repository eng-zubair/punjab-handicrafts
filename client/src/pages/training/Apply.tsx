import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { AuthDialog } from "@/components/AuthDialog";

type TrainingProgram = {
  id: string;
  title: string;
  durationWeeks: number;
};

export default function TrainingApply() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { data: programs = [] } = useQuery<TrainingProgram[]>({ queryKey: ["/api/training/programs"] });
  const [programId, setProgramId] = useState<string>("");
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get("programId");
    if (pid) setProgramId(pid);
  }, []);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/training/applications", { programId, motivation, experience });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/applications/me"] });
      toast({ title: "Application submitted" });
    },
    onError: (err: any) => toast({ title: "Submit failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Apply for Training</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Program</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a program" /></SelectTrigger>
                <SelectContent>
                  {programs.map(p => (<SelectItem key={p.id} value={p.id}>{p.title} • {p.durationWeeks} weeks</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivation</Label>
              <Textarea value={motivation} onChange={(e) => setMotivation(e.target.value)} placeholder="Why do you want to join?" />
            </div>
            <div className="space-y-2">
              <Label>Experience</Label>
              <Textarea value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Any prior art or craft experience" />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (!isAuthenticated) { setAuthOpen(true); return; }
                  if (!programId) { toast({ title: "Select a program", variant: "destructive" }); return; }
                  applyMutation.mutate();
                }}
                disabled={applyMutation.isPending}
              >{applyMutation.isPending ? "Submitting..." : "Submit"}</Button>
              <Button variant="outline" asChild><a href="/training/programs">View Programs</a></Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab="login" />
    </div>
  );
}
