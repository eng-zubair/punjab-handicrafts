import { VendorDashboard } from "./VendorDashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Tag, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Offer } from "@shared/schema";

type Store = { id: string; name: string; status: string; district: string; giBrands: string[] };
type Product = { id: string; title: string; price: string; stock: number; images: string[]; status: string; isActive: boolean; storeId: string; category?: string | null };
type ProductCategory = { id: string; name: string; slug: string; description?: string | null };

const offerFormSchema = z.object({
  name: z.string().min(3, "Promotion name is required"),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().positive("Discount must be positive"),
  startAt: z.string().min(1, "Start date/time is required"),
  endAt: z.string().min(1, "End date/time is required"),
  scopeType: z.enum(["all", "products", "categories"]),
  scopeProducts: z.array(z.string()).optional(),
  scopeCategories: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  badgeText: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.discountType === "percentage" && (val.discountValue <= 0 || val.discountValue > 100)) {
    ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage must be between 1 and 100" });
  }
  const s = new Date(val.startAt);
  const e = new Date(val.endAt);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    ctx.addIssue({ code: "custom", path: ["startAt"], message: "Invalid start/end date" });
  } else if (s >= e) {
    ctx.addIssue({ code: "custom", path: ["endAt"], message: "Start must be before end" });
  }
  if (val.scopeType === "products" && (!val.scopeProducts || val.scopeProducts.length === 0)) {
    ctx.addIssue({ code: "custom", path: ["scopeProducts"], message: "Select at least one product" });
  }
  if (val.scopeType === "categories" && (!val.scopeCategories || val.scopeCategories.length === 0)) {
    ctx.addIssue({ code: "custom", path: ["scopeCategories"], message: "Select at least one category" });
  }
});
type OfferFormValues = z.infer<typeof offerFormSchema>;

function toLocalInput(dt: string) {
  const d = new Date(dt);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function formatDateTime(dt?: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function getStatusBadge(o: Offer) {
  const now = Date.now();
  const start = o.startAt ? new Date(o.startAt).getTime() : 0;
  const end = o.endAt ? new Date(o.endAt).getTime() : 0;
  const activeWindow = start <= now && now <= end;
  const isUpcoming = now < start;
  const isExpired = now > end;
  if (isExpired) return <Badge variant="outline">Expired</Badge>;
  if (isUpcoming) return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Upcoming</Badge>;
  if (activeWindow && o.isActive) return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Active</Badge>;
  return <Badge variant="secondary">Inactive</Badge>;
}

export default function VendorPromotions() {
  const { toast } = useToast();
  const { data: stores = [], isLoading: storesLoading, isError: storesError, refetch: refetchStores } = useQuery<Store[]>({ queryKey: ["/api/vendor/stores"] });
  const store = stores?.[0];

  const { data: offersData, isLoading: offersLoading, isError: offersError, refetch: refetchOffers } = useQuery<{ offers: Offer[]; total: number }>({
    queryKey: ["/api/vendor/offers", { storeId: store?.id, page: 1, pageSize: 100 }],
    enabled: !!store?.id,
  });
  const offers = offersData?.offers || [];

  const { data: vendorProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/vendor/products"],
    enabled: !!store?.id,
  });

  const { data: adminProductCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const createForm = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: 10,
      startAt: "",
      endAt: "",
      scopeType: "products",
      scopeProducts: [],
      scopeCategories: [],
      isActive: true,
      badgeText: "",
    },
  });

  const editForm = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
  });

  useEffect(() => {
    if (selectedOffer) {
      editForm.reset({
        name: selectedOffer.name || "",
        description: selectedOffer.description || "",
        discountType: (selectedOffer.discountType as "percentage" | "fixed") || "percentage",
        discountValue: Number(selectedOffer.discountValue || 0),
        startAt: selectedOffer.startAt ? toLocalInput(String(selectedOffer.startAt)) : "",
        endAt: selectedOffer.endAt ? toLocalInput(String(selectedOffer.endAt)) : "",
        scopeType: (selectedOffer.scopeType as "all" | "products" | "categories") || "products",
        scopeProducts: Array.isArray(selectedOffer.scopeProducts) ? selectedOffer.scopeProducts : [],
        scopeCategories: Array.isArray(selectedOffer.scopeCategories) ? selectedOffer.scopeCategories : [],
        isActive: !!selectedOffer.isActive,
        badgeText: selectedOffer.badgeText || "",
      });
    }
  }, [selectedOffer, editForm]);

  const createMutation = useMutation({
    mutationFn: async (values: OfferFormValues) => {
      const payload = {
        storeId: store?.id,
        name: values.name,
        description: values.description || undefined,
        discountType: values.discountType,
        discountValue: String(values.discountValue),
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        scopeType: values.scopeType,
        scopeProducts: values.scopeType === "products" ? values.scopeProducts : undefined,
        scopeCategories: values.scopeType === "categories" ? values.scopeCategories : undefined,
        isActive: values.isActive,
        badgeText: values.badgeText || undefined,
      };
      return apiRequest("POST", "/api/vendor/offers", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/vendor/offers"] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Promotion created", description: "Your promotion has been created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: OfferFormValues & { id: string }) => {
      const { id, ...v } = values;
      const payload = {
        name: v.name,
        description: v.description || undefined,
        discountType: v.discountType,
        discountValue: String(v.discountValue),
        startAt: new Date(v.startAt).toISOString(),
        endAt: new Date(v.endAt).toISOString(),
        scopeType: v.scopeType,
        scopeProducts: v.scopeType === "products" ? v.scopeProducts : undefined,
        scopeCategories: v.scopeType === "categories" ? v.scopeCategories : undefined,
        isActive: v.isActive,
        badgeText: v.badgeText || undefined,
      };
      return apiRequest("PATCH", `/api/vendor/offers/${id}`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/vendor/offers"] });
      setEditDialogOpen(false);
      setSelectedOffer(null);
      toast({ title: "Promotion updated", description: "Your promotion has been updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/vendor/offers/${id}`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/vendor/offers"] });
      setDeleteDialogOpen(false);
      setSelectedOffer(null);
      toast({ title: "Promotion deleted", description: "The promotion has been removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/vendor/offers/${id}`, { isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/vendor/offers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (storesLoading) {
    return (
      <VendorDashboard>
        <div className="p-6">
          <p className="text-muted-foreground">Loading store...</p>
        </div>
      </VendorDashboard>
    );
  }

  if (storesError) {
    return (
      <VendorDashboard>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Failed to load store</CardTitle>
              <CardDescription>Unable to fetch your store information</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => refetchStores()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </VendorDashboard>
    );
  }

  if (!store) {
    return (
      <VendorDashboard>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Store Found</CardTitle>
              <CardDescription>Create a store first before managing promotions</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </VendorDashboard>
    );
  }

  if (store.status !== "approved") {
    return (
      <VendorDashboard>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Promotions</h1>
            <p className="text-muted-foreground">Create and manage discounts</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Store Not Approved</CardTitle>
              <CardDescription>Your store must be approved before you can create promotions</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </VendorDashboard>
    );
  }

  return (
    <VendorDashboard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Promotions</h1>
            <p className="text-muted-foreground">Create and manage your store offers</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-promotion">
              <Plus className="w-4 h-4 mr-2" />
              Create Promotion
            </Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Promotion</DialogTitle>
                <DialogDescription>Configure discount details and applicability</DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Promotion Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Winter Sale" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="badgeText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Badge Text</FormLabel>
                          <FormControl>
                            <Input placeholder="Limited Time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder="Enter terms and conditions..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              placeholder={createForm.watch("discountType") === "percentage" ? "e.g., 10" : "e.g., 500"}
                              value={field.value}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Active</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="startAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="endAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
                      name="scopeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scope</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select scope" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="products">Products</SelectItem>
                              <SelectItem value="categories">Categories</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {createForm.watch("scopeType") === "products" && (
                      <FormField
                        control={createForm.control}
                        name="scopeProducts"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Applicable Products</FormLabel>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                              {vendorProducts.map((p) => {
                                const checked = Array.isArray(field.value) ? field.value.includes(p.id) : false;
                                return (
                                  <label key={p.id} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(c) => {
                                        const set = new Set(field.value || []);
                                        if (c) set.add(p.id); else set.delete(p.id);
                                        field.onChange(Array.from(set));
                                      }}
                                    />
                                    <span className="line-clamp-1">{p.title}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {createForm.watch("scopeType") === "categories" && (
                      <FormField
                        control={createForm.control}
                        name="scopeCategories"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Applicable Categories</FormLabel>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                              {adminProductCategories.map((c) => {
                                const checked = Array.isArray(field.value) ? field.value.includes(c.name) : false;
                                return (
                                  <label key={c.id} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(cc) => {
                                        const set = new Set(field.value || []);
                                        if (cc) set.add(c.name); else set.delete(c.name);
                                        field.onChange(Array.from(set));
                                      }}
                                    />
                                    <span className="line-clamp-1">{c.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Promotion"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent>
            {offersLoading ? (
              <p className="text-muted-foreground">Loading promotions...</p>
            ) : offersError ? (
              <div className="flex items-center justify-between">
                <p className="text-destructive">Failed to load promotions</p>
                <Button variant="outline" onClick={() => refetchOffers()}>Retry</Button>
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-10">
                <Tag className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No promotions found</p>
                <Button onClick={() => setCreateDialogOpen(true)}>Create Promotion</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Promotion ID</TableHead>
                      <TableHead>Promotion</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((o) => {
                      const t = String(o.discountType || "").toLowerCase();
                      const dv = Number(o.discountValue);
                      const discountLabel = t === "fixed" ? `PKR ${dv.toLocaleString()}` : `${dv}%`;
                      return (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{o.id}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{o.name}</p>
                              {o.badgeText ? <Badge variant="secondary" className="text-xs">{o.badgeText}</Badge> : null}
                            </div>
                          </TableCell>
                          <TableCell>{discountLabel}</TableCell>
                          <TableCell>{formatDateTime(String(o.startAt))}</TableCell>
                          <TableCell>{formatDateTime(String(o.endAt))}</TableCell>
                          <TableCell>{getStatusBadge(o)}</TableCell>
                          <TableCell>
                            <Switch
                              checked={!!o.isActive}
                              onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: o.id, isActive: checked })}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedOffer(o); setEditDialogOpen(true); }}
                                data-testid={`button-edit-offer-${o.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => { setSelectedOffer(o); setDeleteDialogOpen(true); }}
                                data-testid={`button-delete-offer-${o.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Promotion</DialogTitle>
              <DialogDescription>Update your promotion details</DialogDescription>
            </DialogHeader>
            {selectedOffer && (
              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit((values) => updateMutation.mutate({ ...values, id: selectedOffer.id }))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Promotion Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="badgeText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Badge Text</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={editForm.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={field.value}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Active</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="startAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="endAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={editForm.control}
                      name="scopeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scope</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select scope" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="products">Products</SelectItem>
                              <SelectItem value="categories">Categories</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {editForm.watch("scopeType") === "products" && (
                      <FormField
                        control={editForm.control}
                        name="scopeProducts"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Applicable Products</FormLabel>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                              {vendorProducts.map((p) => {
                                const checked = Array.isArray(field.value) ? field.value.includes(p.id) : false;
                                return (
                                  <label key={p.id} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(c) => {
                                        const set = new Set(field.value || []);
                                        if (c) set.add(p.id); else set.delete(p.id);
                                        field.onChange(Array.from(set));
                                      }}
                                    />
                                    <span className="line-clamp-1">{p.title}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {editForm.watch("scopeType") === "categories" && (
                      <FormField
                        control={editForm.control}
                        name="scopeCategories"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Applicable Categories</FormLabel>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                              {adminProductCategories.map((c) => {
                                const checked = Array.isArray(field.value) ? field.value.includes(c.name) : false;
                                return (
                                  <label key={c.id} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(cc) => {
                                        const set = new Set(field.value || []);
                                        if (cc) set.add(c.name); else set.delete(c.name);
                                        field.onChange(Array.from(set));
                                      }}
                                    />
                                    <span className="line-clamp-1">{c.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedOffer?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedOffer && deleteMutation.mutate(selectedOffer.id)}
                className="bg-destructive text-destructive-foreground"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </VendorDashboard>
  );
}

