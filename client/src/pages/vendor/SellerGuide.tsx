import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";

type GuideResource = { id: string; title: string; description: string };

export default function SellerGuide() {
  const [q, setQ] = useState("");
  const { data: resources = [] } = useQuery<GuideResource[]>({
    queryKey: ["/api/guide/resources"],
  });

  const filteredResources = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return resources;
    return resources.filter(r => r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term));
  }, [q, resources]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="space-y-2 mb-6">
            <h1 className="text-4xl font-bold" data-testid="heading-guide">Seller Guide</h1>
            <p className="text-muted-foreground">Documentation, resources, and FAQs for vendors</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the guide"
              aria-label="Search the seller guide"
              data-testid="input-guide-search"
            />
            <Link href="/vendor/register">
              <Button variant="secondary">Create Store</Button>
            </Link>
          </div>

          <Tabs defaultValue="getting-started" className="w-full">
            <TabsList className="grid w-full md:max-w-lg grid-cols-3">
              <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
            </TabsList>

            <TabsContent value="getting-started" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Set up your store</CardTitle>
                  <CardDescription>Create your vendor profile and store details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Go to Create Store and complete the registration form. Verify your email and start adding products.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Choose a pricing plan</CardTitle>
                  <CardDescription>Select a tier that suits your needs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/vendor/pricing">
                    <Button>View Pricing</Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Listing best practices</CardTitle>
                  <CardDescription>Images, descriptions, and GI labeling</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Use high-quality images, clear descriptions, and ensure GI branding is accurate.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="policies" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seller policies</CardTitle>
                  <CardDescription>Returns, shipping, and compliance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Follow marketplace policies for returns and shipping. Ensure compliance with GI regulations.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResources.map((r) => (
                <Card key={r.id}>
                  <CardHeader>
                    <CardTitle>{r.title}</CardTitle>
                    <CardDescription>{r.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <a href={`/api/guide/resources/${r.id}/download`} className="text-primary" data-testid={`link-download-${r.id}`}>Download</a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4 mt-8">
            <h2 className="text-2xl font-semibold">FAQ</h2>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">How do I verify my GI brand?</span>
                <p>Submit documents on the GI Verification page and track your status.</p>
              </div>
              <div>
                <span className="font-medium text-foreground">How do I get featured?</span>
                <p>Upgrade to a Standard or Premium plan for featured placements.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}