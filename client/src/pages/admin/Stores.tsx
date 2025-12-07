import { AdminDashboard } from "./AdminDashboard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Store as StoreIcon, Package, ShoppingCart, Tag, TrendingUp } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import * as React from "react";

type Store = {
  id: string;
  name: string;
  description: string | null;
  district: string;
  giBrands: string[];
  status: string;
  vendorId: string;
  createdAt: string;
};

type StoreActivities = {
  receivedOrders: number;
  fulfilledOrders: number;
  canceledOrders: number;
  revenue: string;
  discounts: number;
};

type Product = {
  id: string;
  title: string;
  price: string;
  stock: number;
  status: string;
  isActive: boolean;
  giBrand: string;
  district: string;
  createdAt: string;
};

export default function AdminStores() {
  const { toast } = useToast();
  const [viewStoreId, setViewStoreId] = React.useState<string | null>(null);
  const [viewProductsStoreId, setViewProductsStoreId] = React.useState<string | null>(null);
  const [viewActivitiesStoreId, setViewActivitiesStoreId] = React.useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = React.useState<{ id: string } | null>(null);
  const [deactivateReason, setDeactivateReason] = React.useState<string>("");
  const [confirmReactivate, setConfirmReactivate] = React.useState<{ id: string } | null>(null);
  const [reactivateNote, setReactivateNote] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<"approved" | "deactivated" | "all">("approved");

  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey: ["/api/admin/stores", { status: filterStatus }],
    queryFn: async () => {
      const url = filterStatus === "all" ? "/api/admin/stores" : `/api/admin/stores?status=${filterStatus}`;
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      return apiRequest("PUT", `/api/admin/stores/${id}/status`, { status, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stores", { status: "approved" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stores", { status: "deactivated" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stores", { status: "all" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: "Store updated" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const { data: activities } = useQuery<StoreActivities | null>({
    queryKey: ["/api/admin/stores/activities", viewActivitiesStoreId || ""],
    enabled: !!viewActivitiesStoreId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/stores/${viewActivitiesStoreId}/activities`, { credentials: "include" });
      return res.ok ? await res.json() : null;
    },
    refetchInterval: 5000,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/admin/stores/products", viewProductsStoreId || ""],
    enabled: !!viewProductsStoreId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/stores/${viewProductsStoreId}/products`, { credentials: "include" });
      return res.ok ? await res.json() : [];
    },
  });

  return (
    <AdminDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Stores</h1>
          <p className="text-muted-foreground">View, analyze, and manage store statuses</p>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <StoreIcon className="w-5 h-5" />
              {filterStatus === "approved" ? "Approved Stores" : filterStatus === "deactivated" ? "Deactivated Stores" : "All Stores"} ({stores.length})
            </CardTitle>
            <ToggleGroup type="single" value={filterStatus} onValueChange={(v) => setFilterStatus((v as any) || "approved")}> 
              <ToggleGroupItem value="approved" aria-label="Approved" variant="outline" size="sm">Approved</ToggleGroupItem>
              <ToggleGroupItem value="deactivated" aria-label="Deactivated" variant="outline" size="sm">Deactivated</ToggleGroupItem>
              <ToggleGroupItem value="all" aria-label="All" variant="outline" size="sm">All</ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading stores...</p>
            ) : stores.length > 0 ? (
              <div className="border rounded-md overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>GI Brands</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.district}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {s.giBrands.slice(0, 3).map((gi) => (
                              <Badge key={gi} variant="secondary" className="text-xs">{gi}</Badge>
                            ))}
                            {s.giBrands.length > 3 && (
                              <Badge variant="secondary" className="text-xs">+{s.giBrands.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="secondary" onClick={() => setViewStoreId(s.id)}>View Profile</Button>
                            <Button size="sm" variant="outline" onClick={() => setViewActivitiesStoreId(s.id)}>
                              <TrendingUp className="w-4 h-4 mr-1" />
                              Activities
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setViewProductsStoreId(s.id)}>
                              <Package className="w-4 h-4 mr-1" />
                              Products
                            </Button>
                            {s.status === 'deactivated' ? (
                              <Button size="sm" onClick={() => { setConfirmReactivate({ id: s.id }); setReactivateNote(""); }}>
                                Reactivate
                              </Button>
                            ) : (
                              <Button size="sm" variant="destructive" onClick={() => { setConfirmDeactivate({ id: s.id }); setDeactivateReason(""); }}>
                                Deactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <StoreIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{filterStatus === 'approved' ? 'No approved stores found' : filterStatus === 'deactivated' ? 'No deactivated stores found' : 'No stores found'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!viewStoreId} onOpenChange={(open) => !open && setViewStoreId(null)}>
          <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Store Profile</DialogTitle>
            </DialogHeader>
            {viewStoreId ? <StoreProfile storeId={viewStoreId} /> : null}
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewProductsStoreId} onOpenChange={(open) => !open && setViewProductsStoreId(null)}>
          <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Store Products</DialogTitle>
            </DialogHeader>
            <div className="mt-4 border rounded-md overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>GI Brand</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "approved" ? "default" : p.status === "pending" ? "outline" : "destructive"}>{p.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? "secondary" : "outline"}>{p.isActive ? "Active" : "Archived"}</Badge>
                      </TableCell>
                      <TableCell>{p.giBrand}</TableCell>
                      <TableCell>{p.price}</TableCell>
                      <TableCell>{p.stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewActivitiesStoreId} onOpenChange={(open) => !open && setViewActivitiesStoreId(null)}>
          <DialogContent className="sm:max-w-[640px] w-[95vw]">
            <DialogHeader>
              <DialogTitle>Store Activities</DialogTitle>
            </DialogHeader>
            {!activities ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /><span>Received Orders</span></div>
                  <div className="font-semibold">{activities.receivedOrders}</div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2"><StoreIcon className="w-4 h-4" /><span>Fulfilled Orders</span></div>
                  <div className="font-semibold">{activities.fulfilledOrders}</div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2"><Tag className="w-4 h-4" /><span>Discount Promotions</span></div>
                  <div className="font-semibold">{activities.discounts}</div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /><span>Revenue</span></div>
                  <div className="font-semibold">{activities.revenue}</div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2"><Tag className="w-4 h-4" /><span>Cancelled Orders</span></div>
                  <div className="font-semibold">{activities.canceledOrders}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmDeactivate} onOpenChange={(open) => !open && setConfirmDeactivate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate store?</AlertDialogTitle>
              <AlertDialogDescription>Provide a reason. The vendor will be notified.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Input placeholder="Reason for deactivation" value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (!confirmDeactivate) return;
                await updateStatusMutation.mutateAsync({ id: confirmDeactivate.id, status: "deactivated", reason: deactivateReason.trim() || undefined });
                setConfirmDeactivate(null);
              }}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!confirmReactivate} onOpenChange={(open) => !open && setConfirmReactivate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reactivate store?</AlertDialogTitle>
              <AlertDialogDescription>Optionally add a note. The vendor will be notified.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Input placeholder="Note (optional)" value={reactivateNote} onChange={(e) => setReactivateNote(e.target.value)} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (!confirmReactivate) return;
                await updateStatusMutation.mutateAsync({ id: confirmReactivate.id, status: "approved", reason: reactivateNote.trim() || undefined });
                setConfirmReactivate(null);
              }}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AdminDashboard>
  );
}

function StoreProfile({ storeId }: { storeId: string }) {
  const { data: store } = useQuery<Store | null>({
    queryKey: ["/api/stores", storeId],
    queryFn: async () => {
      const res = await fetch(`/api/stores/${storeId}`, { credentials: "include" });
      return res.ok ? await res.json() : null;
    },
  });
  if (!store) return <p className="text-muted-foreground">Loading profile...</p>;
  const lines = [
    `<h1>${store.name}</h1>`,
    `<div>Status: ${store.status}</div>`,
    `<div>District: ${store.district}</div>`,
    `<div>GI Brands: ${store.giBrands.join(', ')}</div>`,
    `<div>Created: ${new Date(store.createdAt).toLocaleString()}</div>`,
  ].join("");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Name</div>
          <div className="text-base">{store.name}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="text-base">{store.status}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">District</div>
          <div className="text-base">{store.district}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">GI Brands</div>
          <div className="text-base">{store.giBrands.join(', ')}</div>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">Created</div>
      <div className="text-base">{new Date(store.createdAt).toLocaleString()}</div>
      <div className="flex gap-2 justify-end">
        <Button onClick={() => {
          const w = window.open('', 'storePrint');
          if (!w) return;
          w.document.write(`<!doctype html><meta charset="utf-8"><body>${lines}</body>`);
          w.document.close();
          w.focus();
          w.print();
        }}>Print</Button>
        <Button variant="outline" onClick={() => {
          const blob = new Blob([`<!doctype html><meta charset="utf-8"><body>${lines}</body>`], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `store-profile-${store.id.slice(0,8)}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }}>Download</Button>
      </div>
    </div>
  );
}
