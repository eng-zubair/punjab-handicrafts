import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProductCard from "@/components/ProductCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { School, Coins, Users, MapPin, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { getQueryFn } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

type TrainingCenter = {
  id: string;
  name: string;
  description?: string | null;
  district: string;
  address?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  capacity: number;
  createdAt: string;
};

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

export default function TrainingHome() {
  const { data: centers = [] } = useQuery<TrainingCenter[]>({ queryKey: ["/api/training/centers"] });
  const { data: programs = [] } = useQuery<TrainingProgram[]>({ queryKey: ["/api/training/programs"] });
  const { data: productsData = { products: [] as any[] } } = useQuery<{ products: any[] }>({ queryKey: ["/api/products", { pageSize: 6 }] });
  const products = Array.isArray((productsData as any).products) ? (productsData as any).products : [];
  const districts = useMemo(() => Array.from(new Set(centers.map(c => c.district))), [centers]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(districts[0] || "");
  const districtCenters = useMemo(() => centers.filter(c => c.district === selectedDistrict), [centers, selectedDistrict]);
  const totalCapacity = useMemo(() => centers.reduce((sum, c) => sum + Number(c.capacity || 0), 0), [centers]);

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        <section className="grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-5">
            <Badge variant="secondary" className="px-3 py-1">GI Brands Training</Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">Transforming Ability</span> into Expertise
            </h1>
            <p className="text-muted-foreground">Empowering girls and women to scale as GI communities through structured skills enhancement and post-training income opportunities.</p>
            <div className="flex gap-3">
              <Link href="/training/apply"><Button>Apply Now</Button></Link>
              <Link href="/training/programs"><Button variant="outline">View Programs</Button></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              <div className="rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold">{centers.length}</div>
                <div className="text-xs text-muted-foreground">Centers</div>
              </div>
              <div className="rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold">{programs.length}</div>
                <div className="text-xs text-muted-foreground">Programs</div>
              </div>
              <div className="rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold">{districts.length}</div>
                <div className="text-xs text-muted-foreground">Districts</div>
              </div>
              <div className="rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold">{totalCapacity}</div>
                <div className="text-xs text-muted-foreground">Seats</div>
              </div>
            </div>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-[16/9] bg-gradient-to-br from-emerald-100 via-primary/10 to-amber-100 flex items-center justify-center">
                {products[0]?.images?.[0] || products[0]?.image ? (
                  <img src={(products[0]?.images?.[0] || products[0]?.image) as string} alt="Artisan craft collage" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-16 h-16 text-primary" />
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-center">Our Mission</h2>
          <p className="max-w-3xl mx-auto text-center text-muted-foreground">High-quality vocational training aligned with GI crafts, enabling sustainable livelihoods, cultural preservation, and community-led market access across Punjab.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600"><School className="w-5 h-5" /><span className="font-semibold">Skill Development</span></div>
                <p className="text-sm text-muted-foreground">Structured learning paths with hands-on workshops and milestones.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-2">
                <div className="flex items-center gap-2 text-amber-600"><Coins className="w-5 h-5" /><span className="font-semibold">Economic Empowerment</span></div>
                <p className="text-sm text-muted-foreground">Post-training onboarding with payouts for approved artisan work.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-2">
                <div className="flex items-center gap-2 text-primary"><Users className="w-5 h-5" /><span className="font-semibold">Community Engagement</span></div>
                <p className="text-sm text-muted-foreground">Cluster-based operations connecting trainees, mentors, and vendors.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Skills Enhancement Program</h2>
            <Link href="/training/apply"><Button variant="secondary">Enroll Now</Button></Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {programs.slice(0,3).map(p => (
              <Card key={p.id} className="hover-elevate">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{p.title}</span>
                    <Badge variant="secondary">{p.durationWeeks} weeks</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {p.schedule ? (<div className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /><span>{p.schedule}</span></div>) : null}
                  <div className="text-muted-foreground">Certification on completion</div>
                  <div className="flex gap-2">
                    <Link href={`/training/apply?programId=${p.id}`}><Button size="sm">Apply</Button></Link>
                    <Link href="/training/programs"><Button size="sm" variant="outline">Details</Button></Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-bold">Artisan Registration</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Cottage Industry Promotion</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">Turn skills into income by joining GI vendor network.</p>
                <Link href="/vendor/register"><Button>Register Store</Button></Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Cluster-Based Operations</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">Get verified under GI brands for market access.</p>
                <Link href="/vendor/verification"><Button variant="outline">Start Verification</Button></Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Artisan Marketplace</h2>
            <Link href="/"><Button variant="ghost">View More</Button></Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0,6).map((p: any) => (
              <ProductCard
                key={p.id}
                id={p.id}
                title={p.name || p.title || ""}
                price={p.price}
                image={(Array.isArray(p.images) && p.images[0]) || p.image || ""}
                district={p.district || ""}
                giBrand={p.giBrand || ""}
                vendorName={p.storeName || p.vendorName || ""}
                ratingAverage={p.ratingAverage || 0}
                ratingCount={p.ratingCount || 0}
              />
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-bold">Success Stories</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {["Ayesha Khan","Hina Aslam","Sara Malik"].map((name, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-lg">{name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Graduated from {programs[i]?.title || "GI training"} and delivered approved artisan work with payouts.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-bold">Locate Your Center by District</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-[4/3] bg-gradient-to-br from-primary/15 via-emerald-100 to-amber-100 flex items-center justify-center">
                  <MapPin className="w-16 h-16 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-4">
                <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {districts.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                  </SelectContent>
                </Select>
                <div className="space-y-3">
                  {districtCenters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No centers in this district</p>
                  ) : districtCenters.map(c => (
                    <div key={c.id} className="border rounded p-3 text-sm">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-muted-foreground">Capacity {c.capacity}</div>
                      <div className="text-muted-foreground">{c.address || ""}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border p-4 text-center"><div className="text-2xl font-bold">{centers.length}</div><div className="text-xs text-muted-foreground">Centers</div></div>
            <div className="rounded-xl border p-4 text-center"><div className="text-2xl font-bold">{programs.length}</div><div className="text-xs text-muted-foreground">Programs</div></div>
            <div className="rounded-xl border p-4 text-center"><div className="text-2xl font-bold">{districts.length}</div><div className="text-xs text-muted-foreground">Districts</div></div>
            <div className="rounded-xl border p-4 text-center"><div className="text-2xl font-bold">{totalCapacity}</div><div className="text-xs text-muted-foreground">Seats</div></div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
