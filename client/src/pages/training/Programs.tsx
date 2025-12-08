import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type TrainingProgram = {
  id: string;
  centerId: string;
  title: string;
  description?: string | null;
  durationWeeks: number;
  schedule?: string | null;
  requiredMaterials?: any;
  certificationDetails?: string | null;
  status: string;
  createdAt: string;
};

type CenterMap = Record<string, { name: string; district: string }>;

export default function TrainingPrograms() {
  const { data: programs = [] } = useQuery<TrainingProgram[]>({ queryKey: ["/api/training/programs"] });
  const { data: centers = [] } = useQuery<any[]>({ queryKey: ["/api/training/centers"] });
  const centerMap: CenterMap = Object.fromEntries(centers.map((c: any) => [c.id, { name: c.name, district: c.district }]));

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Training Programs</h1>
            <p className="text-muted-foreground">Detailed curricula, schedules, materials, and certification</p>
          </div>
          <Link href="/training/apply"><Button>Apply</Button></Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {programs.map(p => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  {p.title}
                  <Badge variant="secondary">{p.durationWeeks} weeks</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">{p.description || ""}</p>
                {p.schedule ? (<p><span className="font-medium">Schedule:</span> {p.schedule}</p>) : null}
                {p.requiredMaterials ? (
                  <div>
                    <p className="font-medium">Required materials</p>
                    <ul className="list-disc ml-5 text-muted-foreground">
                      {Array.isArray(p.requiredMaterials) ? p.requiredMaterials.map((m: any, i: number) => (<li key={i}>{String(m)}</li>)) : Object.values(p.requiredMaterials || {}).map((m: any, i: number) => (<li key={i}>{String(m)}</li>))}
                    </ul>
                  </div>
                ) : null}
                {p.certificationDetails ? (<p><span className="font-medium">Certification:</span> {p.certificationDetails}</p>) : null}
                <p className="text-muted-foreground">Center: {centerMap[p.centerId]?.name || ""} • {centerMap[p.centerId]?.district || ""}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

