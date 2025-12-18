import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { insertPromotionSchema, type Product } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Extend the schema to handle date strings from inputs
// Remove targetId validation as we'll handle product selection separately
const formSchema = insertPromotionSchema.omit({ storeId: true, targetId: true }).extend({
    startAt: z.string().optional().transform(str => str ? new Date(str).toISOString() : null),
    endAt: z.string().optional().transform(str => str ? new Date(str).toISOString() : null),
    value: z.string().transform(v => v.toString()), // Ensure string for decimal
    priority: z.coerce.number().min(0).default(0),
    usageLimit: z.coerce.number().optional(),
    usageLimitPerUser: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PromotionDetailsFormProps {
    defaultValues?: Partial<FormValues>;
    onSubmit: (data: FormValues, selectedProductIds?: string[]) => void;
    isLoading?: boolean;
    submitLabel?: string;
    promotionId?: string; // For editing existing promotions
}


export function PromotionDetailsForm({
    defaultValues,
    onSubmit,
    isLoading,
    submitLabel = "Save Promotion",
    promotionId
}: PromotionDetailsFormProps) {
    const { toast } = useToast();
    const form = useForm<FormValues>({

        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            type: "percentage",
            value: "0",
            appliesTo: "order", // default to simple order-wide for now
            priority: 0,
            stackable: false,
            status: "active",
            ...defaultValues,
            // Format dates for input type="datetime-local" if they exist
            startAt: defaultValues?.startAt ? format(new Date(defaultValues.startAt), "yyyy-MM-dd'T'HH:mm") : undefined,
            endAt: defaultValues?.endAt ? format(new Date(defaultValues.endAt), "yyyy-MM-dd'T'HH:mm") : undefined,
        } as any,
    });

    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ["/api/vendor/products"],
    });

    const appliesTo = form.watch("appliesTo");
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    const toggleProductSelection = (productId: string) => {
        setSelectedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const toggleAllProducts = () => {
        if (selectedProductIds.length === products.length) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(products.map(p => p.id));
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => {
                // Validate product selection for specific products
                if (data.appliesTo === 'product' && selectedProductIds.length === 0) {
                    toast({
                        title: "Validation Error",
                        description: "Please select at least one product for this promotion.",
                        variant: "destructive"
                    });
                    return;
                }
                onSubmit(data, data.appliesTo === 'product' ? selectedProductIds : undefined);
            }, (errors) => {
                console.error("Form validation errors:", errors);
                toast({
                    title: "Validation Error",
                    description: "Please check the form fields for errors.",
                    variant: "destructive"
                });
            })} className="space-y-6" noValidate>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Basic Information</h3>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Promotion Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Summer Sale 2024" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Internal notes or customer facing description..." {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="appliesTo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Promotion Scope</FormLabel>
                                        <Select
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                if (val !== 'product') {
                                                    setSelectedProductIds([]);
                                                }
                                            }}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select scope" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="order">All Products (Store-wide)</SelectItem>
                                                <SelectItem value="product">Specific Products</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Choose whether this promotion applies to all products or specific items.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {appliesTo === 'product' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Select Products ({selectedProductIds.length} selected)</FormLabel>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={toggleAllProducts}
                                        >
                                            {selectedProductIds.length === products.length ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    </div>
                                    <div className="border rounded-lg max-h-64 overflow-y-auto">
                                        {products.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                No products available. Please add products first.
                                            </div>
                                        ) : (
                                            <div className="p-2 space-y-1">
                                                {products.map((product) => (
                                                    <div
                                                        key={product.id}
                                                        className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                                                        onClick={() => toggleProductSelection(product.id)}
                                                    >
                                                        <Checkbox
                                                            checked={selectedProductIds.includes(product.id)}
                                                            onCheckedChange={() => toggleProductSelection(product.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{product.title}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                PKR {product.price} • Stock: {product.stock}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {selectedProductIds.length === 0 && (
                                        <p className="text-sm text-destructive">
                                            Please select at least one product
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Discount Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                <SelectItem value="fixed">Fixed Amount (PKR)</SelectItem>
                                                {/* Simplify for now, allow rules to handle complex BOGO logic if needed */}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Value</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Configuration</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startAt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Start Date</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} value={field.value as string || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="endAt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>End Date</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} value={field.value as string || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="0" {...field} />
                                        </FormControl>
                                        <FormDescription>Higher applies first.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                                <SelectItem value="draft">Draft</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="stackable"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Stackable</FormLabel>
                                        <FormDescription>
                                            Allow this promotion to combine with others.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Usage Limits */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-lg">Usage Limits</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="usageLimit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Total Global Usage Limit</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Unlimited" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>Max number of times this can be used store-wide.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="usageLimitPerUser"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Limit Per Customer</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Unlimited" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>Max times a single user can use this.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {submitLabel}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
