import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Store = { id: string; name: string; status: string };
type DocItem = { name: string; url: string };

export default function Verification() {
  const { toast } = useToast();
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ["/api/vendor/stores"],
  });
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || "");
  const [fullName, setFullName] = useState("");
  const [brand, setBrand] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  const { data: docs = [] } = useQuery<DocItem[]>({
    queryKey: ["/api/vendor/verification/docs", selectedStoreId],
    enabled: !!selectedStoreId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("storeId", selectedStoreId);
      fd.append("fullName", fullName);
      fd.append("brand", brand);
      if (files) {
        Array.from(files).forEach((f) => fd.append("files", f));
      }
      return fetch("/api/vendor/verification/upload", { method: "POST", body: fd });
    },
    onSuccess: () => {
      toast({ title: "Submitted", description: "Verification documents uploaded" });
    },
    onError: () => {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/vendor/verification/submit", { storeId: selectedStoreId });
    },
    onSuccess: () => {
      toast({ title: "Submitted", description: "Verification requested" });
    },
    onError: () => {
      toast({ title: "Error", description: "Submission failed", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="space-y-2 mb-6">
            <h1 className="text-4xl font-bold" data-testid="heading-verification">GI Verification</h1>
            <p className="text-muted-foreground">Upload documents and track verification status</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Verification Form</CardTitle>
              <CardDescription>Provide details and attach documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="store">Store</Label>
                  <select id="store" className="w-full h-10 rounded-md border bg-background" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} aria-label="Select store">
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="brand">GI Brand</Label>
                  <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="files">Documents</Label>
                  <Input id="files" type="file" multiple onChange={(e) => setFiles(e.target.files)} aria-label="Upload documents" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => uploadMutation.mutate()} data-testid="button-upload">Upload</Button>
                <Button variant="secondary" onClick={() => submitMutation.mutate()} data-testid="button-submit">Submit for Verification</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2 mt-8">
            <h2 className="text-2xl font-semibold">Status</h2>
            <div className="grid gap-2 text-sm">
              {stores.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="min-w-40">{s.name}</span>
                  <span className="text-muted-foreground">{s.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 mt-8">
            <h2 className="text-2xl font-semibold">Uploaded Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {docs.map((d) => (
                <a key={d.name} href={d.url} className="text-primary" data-testid={`link-doc-${d.name}`}>{d.name}</a>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}