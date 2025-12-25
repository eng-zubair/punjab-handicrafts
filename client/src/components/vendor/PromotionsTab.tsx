import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Promotion } from "@shared/schema";
import { Plus, Edit, Trash2, Tag, Calendar, Layers, AlertCircle } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import { PromotionDetailsForm } from "./PromotionDetailsForm";
import { PromotionRuleBuilder } from "@/components/vendor/PromotionRuleBuilder";
import { PromotionActionBuilder } from "@/components/vendor/PromotionActionBuilder";

export default function PromotionsTab() {
    const { toast } = useToast();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
    const [attachPromotion, setAttachPromotion] = useState<Promotion | null>(null);

    const { data: products = [] } = useQuery<any[]>({
        queryKey: ["/api/vendor/products"],
    });

    const [productSelection, setProductSelection] = useState<Record<string, { selected: boolean; quantityLimit: string; overridePrice: string }>>({});

    const { data: promotions = [], isLoading } = useQuery<Promotion[]>({
        queryKey: ["/api/vendor/promotions"],
    });

    const createMutation = useMutation({
        mutationFn: async ({ data, productIds }: { data: any; productIds?: string[] }) => {
            console.log("=== Creating Promotion ===");
            console.log("Data:", data);
            console.log("Product IDs:", productIds);

            const res = await apiRequest("POST", "/api/vendor/promotions", data);
            const newPromo = await res.json();
            console.log("Promotion created:", newPromo);

            // If specific products were selected, associate them with the promotion
            if (productIds && productIds.length > 0) {
                console.log(`Associating ${productIds.length} products with promotion ${newPromo.id}`);
                const items = productIds.map(productId => ({
                    productId,
                    overridePrice: undefined,
                    quantityLimit: undefined,
                    conditions: undefined
                }));

                console.log("Calling bulk products API with items:", items);
                try {
                    const bulkRes = await apiRequest("POST", `/api/vendor/promotions/${newPromo.id}/products/bulk`, { items });
                    const bulkResult = await bulkRes.json();
                    console.log("Bulk products result:", bulkResult);

                    if (bulkResult.added) {
                        console.log(`✅ Successfully associated ${bulkResult.added} products`);
                    }
                    if (bulkResult.invalid && bulkResult.invalid.length > 0) {
                        console.warn(`⚠️ Failed to associate ${bulkResult.invalid.length} products:`, bulkResult.invalid);
                    }
                } catch (bulkError: any) {
                    console.error("❌ Error during bulk product association:", bulkError);
                    throw new Error(`Promotion created but failed to associate products: ${bulkError.message}`);
                }
            } else {
                console.log("No products selected - this is a store-wide promotion");
            }

            return newPromo;
        },
        onSuccess: (newPromo) => {
            console.log("✅ Promotion creation successful, invalidating queries");
            queryClient.invalidateQueries({ queryKey: ["/api/vendor/promotions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/vendor/promotion-products"] });
            toast({
                title: "Promotion Created",
                description: "Your promotion has been created successfully."
            });
            setIsCreateOpen(false);
            // Automatically open edit mode for the new promotion to encourage rule setup
            setSelectedPromotion(newPromo);
        },
        onError: (err: any) => {
            console.error("❌ Promotion creation error:", err);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const attachProductsMutation = useMutation({
        mutationFn: async ({ promotionId, items }: { promotionId: string; items: Array<{ productId: string; quantityLimit?: number; overridePrice?: string | null }> }) => {
            await apiRequest("POST", `/api/vendor/promotions/${promotionId}/products/bulk`, { items });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/vendor/promotion-products"] });
            toast({
                title: "Products Attached",
                description: "Selected products have been added to the promotion.",
            });
            setAttachPromotion(null);
            setProductSelection({});
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!selectedPromotion) return;
            const res = await apiRequest("PATCH", `/api/vendor/promotions/${selectedPromotion.id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/vendor/promotions"] });
            toast({ title: "Updated", description: "Promotion details updated successfully." });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/vendor/promotions/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/vendor/promotions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/vendor/analytics"] });
            toast({ title: "Deleted", description: "Promotion removed successfully" });
            if (selectedPromotion) setSelectedPromotion(null);
        },
    });

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading promotions...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Promotions Engine</h2>
                    <p className="text-muted-foreground">
                        Create powerful discounts with custom rules and actions.
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Promotion
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Promotion</DialogTitle>
                            <DialogDescription>
                                Start by defining the basic details. You can add specific rules and actions in the next step.
                            </DialogDescription>
                        </DialogHeader>
                        <PromotionDetailsForm
                            onSubmit={(data, productIds) => createMutation.mutate({ data, productIds })}
                            isLoading={createMutation.isPending}
                            submitLabel="Create & Configure"
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {promotions.length === 0 ? (
                    <Card className="col-span-full border-dashed p-8 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <Tag className="h-10 w-10 text-muted-foreground/50" />
                            <div className="text-lg font-medium">No promotions active</div>
                            <p className="text-sm text-muted-foreground">
                                Get started by creating your first discount campaign.
                            </p>
                            <Button onClick={() => setIsCreateOpen(true)} variant="outline">
                                Create Promotion
                            </Button>
                        </div>
                    </Card>
                ) : (
                    promotions.map((promo) => (
                        <Card key={promo.id} className={`relative overflow-hidden transition-all hover:shadow-md ${promo.status === 'active' ? 'border-primary/20' : ''}`}>
                            {promo.status === 'active' && (
                                <div className="absolute top-0 right-0 h-2 w-full bg-primary/10" />
                            )}
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg font-bold">{promo.name}</CardTitle>
                                        <CardDescription className="line-clamp-1 mt-1">
                                            {promo.description || "No description provided"}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={promo.status === 'active' ? "default" : "secondary"} className="capitalize">
                                        {promo.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center text-muted-foreground">
                                        <Tag className="mr-2 h-4 w-4 opacity-70" />
                                        <span className="font-medium mr-1 text-foreground">
                                            {promo.type === 'percentage'
                                                ? `${promo.value}% Off`
                                                : promo.type === 'fixed'
                                                    ? `PKR ${promo.value} Off`
                                                    : promo.type === 'buy-one-get-one'
                                                        ? 'Buy One Get One'
                                                        : promo.value}
                                        </span>
                                        <span className="text-xs">via {promo.type}</span>
                                    </div>

                                    <div className="flex items-center text-muted-foreground">
                                        <Calendar className="mr-2 h-4 w-4 opacity-70" />
                                        <span>
                                            {promo.startAt ? format(new Date(promo.startAt), "MMM d") : "Now"}
                                            {" → "}
                                            {promo.endAt ? format(new Date(promo.endAt), "MMM d, yyyy") : "Forever"}
                                        </span>
                                    </div>

                                    <div className="flex items-center text-muted-foreground">
                                        <Layers className="mr-2 h-4 w-4 opacity-70" />
                                        <span>Priority: {promo.priority}</span>
                                        {promo.stackable && <Badge variant="outline" className="ml-2 text-[10px] h-5">Stackable</Badge>}
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => setSelectedPromotion(promo)}
                                        >
                                            <Edit className="mr-2 h-3 w-3" />
                                            Manage
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => {
                                                setAttachPromotion(promo);
                                                setProductSelection({});
                                            }}
                                            data-testid={`button-attach-products-${promo.id}`}
                                        >
                                            Attach Products
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Promotion?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently remove "{promo.name}" and all its rules. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteMutation.mutate(promo.id)}
                                                        className="bg-destructive hover:bg-destructive/90"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Details/Edit/Rules Dialog */}
            <Dialog open={!!selectedPromotion} onOpenChange={(open) => !open && setSelectedPromotion(null)}>
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>Manage Promotion: {selectedPromotion?.name}</DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">Details & Settings</TabsTrigger>
                            <TabsTrigger value="rules" className="flex items-center gap-2">
                                Rules <Badge variant="secondary" className="px-1 h-5 text-[10px]">Conditions</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="actions" className="flex items-center gap-2">
                                Actions <Badge variant="secondary" className="px-1 h-5 text-[10px]">Rewards</Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="pt-6">
                            <PromotionDetailsForm
                                defaultValues={selectedPromotion as any}
                                onSubmit={(data) => updateMutation.mutate(data)}
                                isLoading={updateMutation.isPending}
                                submitLabel="Update Details"
                                promotionId={selectedPromotion?.id}
                            />
                        </TabsContent>

                        <TabsContent value="rules" className="pt-6 min-h-[400px]">
                            <div className="bg-muted/30 p-4 rounded-lg border mb-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-foreground">How Rules Work</p>
                                        <p className="text-muted-foreground mt-1">
                                            Define <strong>WHEN</strong> this promotion applies. All rules must be met for the discount to trigger (AND logic).
                                            Only Cart-level rules generally apply here.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {selectedPromotion && <PromotionRuleBuilder promotionId={selectedPromotion.id} />}
                        </TabsContent>

                        <TabsContent value="actions" className="pt-6 min-h-[400px]">
                            <div className="bg-muted/30 p-4 rounded-lg border mb-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-foreground">How Actions Work</p>
                                        <p className="text-muted-foreground mt-1">
                                            Define <strong>WHAT</strong> happens when rules are met.
                                            You can offer percentage discounts, fixed amounts, or free shipping.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {selectedPromotion && <PromotionActionBuilder promotionId={selectedPromotion.id} />}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Attach Products Dialog */}
            <Dialog
                open={!!attachPromotion}
                onOpenChange={(open) => {
                    if (!open) {
                        setAttachPromotion(null);
                        setProductSelection({});
                    }
                }}
            >
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Products to Promotion</DialogTitle>
                        <DialogDescription>
                            Select products to include in this promotion and configure optional limits.
                        </DialogDescription>
                    </DialogHeader>

                    {!attachPromotion ? null : (
                        <div className="space-y-4">
                            {products.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No products available to attach.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {products.map((product: any) => {
                                        const state = productSelection[product.id] || {
                                            selected: false,
                                            quantityLimit: "1",
                                            overridePrice: "",
                                        };

                                        return (
                                            <div
                                                key={product.id}
                                                className="flex items-center justify-between gap-4 border rounded-lg p-3"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Checkbox
                                                        checked={state.selected}
                                                        onCheckedChange={(checked) => {
                                                            const isChecked = checked === true;
                                                            setProductSelection((prev) => ({
                                                                ...prev,
                                                                [product.id]: {
                                                                    selected: isChecked,
                                                                    quantityLimit: state.quantityLimit,
                                                                    overridePrice: state.overridePrice,
                                                                },
                                                            }));
                                                        }}
                                                        data-testid={`checkbox-select-product-${product.id}`}
                                                    />
                                                    <div>
                                                        <div className="font-medium">
                                                            {product.title}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            PKR {product.price}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-muted-foreground">
                                                            Quantity Limit
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={state.quantityLimit}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                setProductSelection((prev) => ({
                                                                    ...prev,
                                                                    [product.id]: {
                                                                        selected: state.selected,
                                                                        quantityLimit: value,
                                                                        overridePrice: state.overridePrice,
                                                                    },
                                                                }));
                                                            }}
                                                            className="w-24"
                                                            data-testid={`input-quantity-limit-${product.id}`}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-muted-foreground">
                                                            Override Price (PKR)
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            value={state.overridePrice}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                setProductSelection((prev) => ({
                                                                    ...prev,
                                                                    [product.id]: {
                                                                        selected: state.selected,
                                                                        quantityLimit: state.quantityLimit,
                                                                        overridePrice: value,
                                                                    },
                                                                }));
                                                            }}
                                                            className="w-28"
                                                            data-testid={`input-override-price-${product.id}`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setAttachPromotion(null);
                                        setProductSelection({});
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (!attachPromotion) return;
                                        const items = Object.entries(productSelection)
                                            .filter(([, state]) => state.selected)
                                            .map(([productId, state]) => ({
                                                productId,
                                                quantityLimit: state.quantityLimit
                                                    ? Number(state.quantityLimit)
                                                    : undefined,
                                                overridePrice: state.overridePrice || undefined,
                                            }));

                                        if (items.length === 0) {
                                            toast({
                                                title: "No products selected",
                                                description: "Select at least one product to attach.",
                                                variant: "destructive",
                                            });
                                            return;
                                        }

                                        attachProductsMutation.mutate({
                                            promotionId: attachPromotion.id,
                                            items,
                                        });
                                    }}
                                    disabled={attachProductsMutation.isPending}
                                    data-testid="button-submit-attach"
                                >
                                    {attachProductsMutation.isPending ? "Attaching..." : "Attach Selected"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
