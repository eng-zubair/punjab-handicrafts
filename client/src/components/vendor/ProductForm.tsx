// Accessible, responsive vendor ProductForm aligned with backend specs
// - Validates fields using zod and mirrors server-side requirements
// - Handles image upload with proper user feedback
// - Supports optional variants with per-variant SKU/price/stock
// - Integrates with API via react-query mutations
import React, { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { variantSchema, type Variant } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { normalizeImagePath } from "@/lib/utils/image";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

// Types aligned with backend
type Store = {
  id: string;
  name: string;
  district: string;
  giBrands: string[];
};

type Category = {
  id: string;
  district: string;
  giBrand: string;
  crafts: string[];
};

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: string;
  stock: number;
  images: string[];
  district: string;
  giBrand: string;
  storeId: string;
  category?: string | null;
  variants?: string | Variant[] | null;
};

type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt?: string;
};

// Form schema mirroring backend expectations
const productFormSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters"),
    price: z
      .string()
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Price must be a positive number"),
    stock: z
      .string()
      .refine(
        (val) => !isNaN(Number(val)) && Number(val) >= 0,
        "Stock must be a non-negative number"
      ),
    district: z.string().min(1, "Please select a district"),
    giBrand: z.string().min(1, "Please select a GI brand"),
    images: z.array(z.string()).min(1, "Upload at least one image"),
    category: z.string().min(1, "Select a category"),
    hasVariants: z.boolean().default(false),
    variants: z.array(variantSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasVariants) {
      if (!data.variants || data.variants.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please add at least one variant",
          path: ["variants"],
        });
      }
      // Enforce unique variant SKUs
      if (data.variants && data.variants.length > 0) {
        const skus = data.variants.map(v => v.sku.trim()).filter(Boolean);
        const seen = new Set<string>();
        for (const s of skus) {
          if (seen.has(s)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate SKU: ${s}`,
              path: ["variants"],
            });
            break;
          }
          seen.add(s);
        }
      }
    }
  });

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function ProductForm({
  mode,
  store,
  categories,
  product,
  onCancel,
  onSuccess,
  submitText,
  productCategories: productCategoriesProp,
}: {
  mode: "create" | "edit";
  store: Store;
  categories: Category[];
  product?: Product | null;
  onCancel: () => void;
  onSuccess: () => void;
  submitText?: string;
  productCategories?: ProductCategory[];
}) {
  const { toast } = useToast();
  const [uploadedImages, setUploadedImages] = useState<string[]>(
    product?.images || []
  );
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form with server-aligned defaults; prefill when editing
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: product?.title || "",
      description: product?.description || "",
      price: product?.price || "",
      stock: product ? String(product.stock) : "",
      district: product?.district || store?.district || "",
      giBrand: product?.giBrand || store?.giBrands?.[0] || "",
      images: product?.images || [],
      category: (product?.category as any) || "Other",
      hasVariants: Array.isArray(product?.variants)
        ? (product?.variants as Variant[]).length > 0
        : typeof product?.variants === "string" && product?.variants?.length > 0,
      variants: (() => {
        if (!product?.variants) return [];
        try {
          const v =
            typeof product.variants === "string"
              ? JSON.parse(product.variants)
              : product.variants;
          return Array.isArray(v) ? v : [];
        } catch {
          return [];
        }
      })(),
    },
    mode: "onBlur",
  });

  const { data: productCategoriesQuery = [], isLoading: loadingProductCategories } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
    placeholderData: (prev) => prev ?? [{ id: "other", name: "Other", slug: "other" } as ProductCategory],
  });
  const productCategories = productCategoriesProp ?? productCategoriesQuery;

  // Manage dynamic variant fields
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const variantsWatch = form.watch("variants") as unknown as Variant[] | undefined;
  const hasVariants = form.watch("hasVariants");
  const variantTotalStock = hasVariants && Array.isArray(variantsWatch)
    ? variantsWatch.reduce((s, v) => s + (Number((v as any)?.stock || 0)), 0)
    : undefined;

  useEffect(() => {
    form.setValue("images", uploadedImages);
  }, [uploadedImages]);

  // Accessible image upload feedback; stores uploaded image paths
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !store) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(
        `/api/upload/product-images?storeId=${store.id}`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload images");
      }

      const data = await response.json();
      setUploadedImages(data.images);
      toast({
        title: "Images uploaded",
        description: `Successfully uploaded ${data.images.length} image(s)`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Create/Update product via API; stringifies variants server-side
  const mutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const body = {
        storeId: store.id,
        title: values.title,
        description: values.description,
        price: values.price,
        stock: parseInt(values.stock),
        district: values.district,
        giBrand: values.giBrand,
        images: uploadedImages,
        category: values.category,
        hasVariants: values.hasVariants,
        variants: values.hasVariants ? (values.variants ?? []).map((v) => ({
          ...v,
          name: v.name && v.name.trim().length ? v.name : `${v.type} ${v.option}`,
        })) : undefined,
      };
      if (mode === "create") {
        return apiRequest("POST", "/api/products", body);
      } else if (product?.id) {
        const editBody = {
          ...body,
          images: uploadedImages.length > 0 ? uploadedImages : product.images,
        };
        return apiRequest("PATCH", `/api/vendor/products/${product.id}`, editBody);
      }
    },
    onSuccess: async () => {
      try {
        queryClient.invalidateQueries({ queryKey: ["/api/vendor/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/vendor/analytics"] });
      } catch {}
      toast({
        title: mode === "create" ? "Product added" : "Product updated",
        description:
          mode === "create"
            ? "Your product has been submitted for approval"
            : "Your product has been updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to submit product";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  // Submit handler delegates to mutation
  const onSubmit = (values: ProductFormValues) => {
    mutation.mutate(values);
  };

  const handleVariantImageUpload = async (index: number, files: File[]) => {
    if (!store || files.length === 0) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const oversized = files.find((f) => f.size > 5 * 1024 * 1024);
    if (oversized) {
      toast({ title: "File too large", description: `${oversized.name} exceeds 5MB`, variant: "destructive" });
      return;
    }
    const bad = files.find((f) => !allowed.includes(f.type));
    if (bad) {
      toast({ title: "Unsupported format", description: `${bad.name} is not JPG/PNG/WebP`, variant: "destructive" });
      return;
    }
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      const res = await fetch(`/api/upload/product-images?storeId=${store.id}`, { method: "POST", credentials: "include", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      const current = (form.getValues(`variants.${index}.images` as const) as unknown as string[]) || [];
      form.setValue(`variants.${index}.images` as const, [...current, ...data.images]);
      toast({ title: "Variant images uploaded", description: `${data.images.length} image(s) added` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message || String(e), variant: "destructive" });
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-label={mode === "create" ? "Add Product" : "Edit Product"}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="title">Product Title</FormLabel>
              <FormControl>
                <Input id="title" placeholder="Handwoven Basket" data-testid="input-product-title" {...field} />
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
              <FormLabel htmlFor="description">Description</FormLabel>
              <FormControl>
                <Textarea id="description" placeholder="Describe your product..." className="min-h-24" data-testid="input-product-description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="price">Price (PKR)</FormLabel>
                <FormControl>
                  <Input id="price" type="number" inputMode="decimal" placeholder="1500" data-testid="input-product-price" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="stock">Stock</FormLabel>
                <FormControl>
                  <Input id="stock" type="number" inputMode="numeric" placeholder="10" data-testid="input-product-stock" {...field} />
                </FormControl>
                <FormMessage />
                {hasVariants && (
                  <FormDescription>
                    When variants are enabled, base stock is derived: {variantTotalStock ?? 0}
                  </FormDescription>
                )}
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="district"
            render={({ field }) => (
              <FormItem>
                <FormLabel>District</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label="Select district" data-testid="select-product-district">
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.district} value={cat.district}>
                        {cat.district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="giBrand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GI Brand</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label="Select GI brand" data-testid="select-product-gi-brand">
                      <SelectValue placeholder="Select GI brand" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.giBrand} value={cat.giBrand}>
                        {cat.giBrand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Geographical Indication certified brand
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger aria-label="Select category">
                    <SelectValue placeholder={loadingProductCategories ? "Loading categories..." : "Select category"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem key="other-default" value="Other">Other</SelectItem>
                  {productCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hasVariants"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Product Variants</FormLabel>
                <FormDescription>
                  Enable to add multiple variants (size, color, etc.)
                </FormDescription>
              </div>
              <FormControl>
                <Switch aria-label="Toggle product variants" checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {hasVariants && (
          <div className="space-y-4 border rounded-md p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Variants</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ type: "", option: "", sku: "", price: 0, stock: 0, barcode: "", weightKg: undefined, lengthCm: undefined, widthCm: undefined, heightCm: undefined, images: [] } as any)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </div>

            {fields.map((f, index) => (
              <div key={f.id} className="grid gap-4 border-b pb-4 mb-4 last:border-0 last:pb-0 last:mb-0 relative bg-muted/50 p-4 rounded-md">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove variant ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`variants.${index}.type` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Type (e.g. Size)</FormLabel>
                        <FormControl>
                          <Input placeholder="Size" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.option` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Option (e.g. Small)</FormLabel>
                        <FormControl>
                          <Input placeholder="Small" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`variants.${index}.name` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Variant Name<span aria-hidden="true" className="text-destructive"> *</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Size Small" className="h-8" aria-required="true" {...field} />
                      </FormControl>
                      <FormDescription>Used for display. Defaults to Type + Option if left blank.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`variants.${index}.sku` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="SKU-001" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.price` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Price</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.stock` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Stock</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name={`variants.${index}.barcode` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Barcode/ISBN (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="978-..." className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.weightKg` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" placeholder="0.5" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.lengthCm` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Length (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="10" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.widthCm` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Width (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="5" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.heightCm` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="2" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`variants.${index}.images` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Variant Images</FormLabel>
                      <FormControl>
                        <div
                          className="border rounded-md p-3 bg-background"
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            const files = Array.from(e.dataTransfer.files || []).filter(f => /image\/(jpeg|jpg|png|webp)/i.test(f.type));
                            await handleVariantImageUpload(index, files as File[]);
                          }}
                          aria-label="Drop images here"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              multiple
                              aria-label="Upload variant images"
                              onChange={async (e) => {
                                const list = e.target.files;
                                const files = list ? Array.from(list) : [];
                                await handleVariantImageUpload(index, files);
                              }}
                              className="h-8"
                            />
                            <span className="text-xs text-muted-foreground">Max 5MB per image. JPG/PNG/WebP.</span>
                          </div>
                          {Array.isArray(field.value) && field.value.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-2" aria-live="polite">
                              {field.value.map((img: string, i: number) => (
                                <div key={i} className="relative w-16 h-16 rounded border">
                                  <img src={normalizeImagePath(img)} alt={`Variant ${index + 1} - ${i + 1}`} className="w-full h-full object-cover rounded" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground" role="status">
                No variants added. Click "Add Variant" to start.
              </p>
            )}
            <FormMessage>{form.formState.errors.variants?.message as any}</FormMessage>
          </div>
        )}

        <FormField
          control={form.control}
          name="images"
          render={() => (
            <FormItem>
              <FormLabel>Product Images</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    aria-label="Upload product images"
                    data-testid="input-product-images"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <p className="text-sm text-muted-foreground">Uploading images...</p>
                  )}
                  {uploadedImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap" aria-live="polite">
                      {uploadedImages.map((img, index) => (
                        <div key={index} className="relative w-20 h-20 rounded border">
                          <img
                            src={normalizeImagePath(img)}
                            alt={`Product ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload up to 5 images (JPEG, PNG, WebP). Max 5MB per image.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} aria-label="Cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} aria-label={mode === "create" ? (submitText ? submitText : "Add Product") : "Update Product"}>
            {mutation.isPending 
              ? (mode === "create" ? (submitText ? submitText.replace(/Product$/,'ing...') : "Adding...") : "Updating...")
              : (submitText ?? (mode === "create" ? "Add Product" : "Update Product"))}
          </Button>
        </div>
      </form>
    </Form>
  );
}
