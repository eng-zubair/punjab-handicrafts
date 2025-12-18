import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, Upload, Edit2, Trash2, Check, X, ArrowLeft, ArrowRight, Save, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeImagePath } from '@/lib/utils/image';

// Enhanced schemas for comprehensive product management
const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Variant name is required'),
  size: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  attributes: z.array(z.object({
    name: z.string().min(1, 'Attribute name is required'),
    value: z.string().min(1, 'Attribute value is required'),
  })).optional(),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Price must be a positive number'),
  stock: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Stock must be a non-negative number'),
  sku: z.string().optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

const productVariantSchema = z.object({
  hasVariants: z.boolean().default(false),
  variantAttributes: z.array(z.string()).optional(), // e.g., ["Size", "Color", "Material"]
  variants: z.array(variantSchema).optional(),
});

const stage1Schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must not exceed 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must not exceed 2000 characters'),
  category: z.string().min(1, 'Please select a category'),
  district: z.string().min(1, 'Please select a district'),
  giBrand: z.string().min(1, 'Please select a GI brand'),
  tags: z.array(z.string()).optional(),
});

const stage2Schema = z.object({
  basePrice: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Base price must be a positive number'),
  compareAtPrice: z.string().optional(),
  costPerItem: z.string().optional(),
  profit: z.string().optional(),
  margin: z.string().optional(),
  taxCode: z.string().optional(),
  inventoryTracking: z.boolean().default(true),
  stockQuantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Stock must be a non-negative number'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  allowBackorders: z.boolean().default(false),
  lowStockWarning: z.string().optional(),
});

const stage3Schema = productVariantSchema;

const stage4Schema = z.object({
  images: z.array(z.string()).min(1, 'At least one image is required').max(10, 'Maximum 10 images allowed'),
  documents: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
  })).optional(),
  specifications: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional(),
  seoTitle: z.string().max(60, 'SEO title must not exceed 60 characters').optional(),
  seoDescription: z.string().max(160, 'SEO description must not exceed 160 characters').optional(),
  shippingWeight: z.string().optional(),
  shippingDimensions: z.object({
    length: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
  }).optional(),
});

const comprehensiveProductSchema = z.object({
  stage1: stage1Schema,
  stage2: stage2Schema,
  stage3: stage3Schema,
  stage4: stage4Schema,
});

type ComprehensiveProductFormValues = z.infer<typeof comprehensiveProductSchema>;
type Stage1Values = z.infer<typeof stage1Schema>;
type Stage2Values = z.infer<typeof stage2Schema>;
type Stage3Values = z.infer<typeof stage3Schema>;
type Stage4Values = z.infer<typeof stage4Schema>;

interface ComprehensiveProductFormProps {
  onSubmit: (data: ComprehensiveProductFormValues) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ComprehensiveProductFormValues>;
  storeId: string;
  categories: Array<{ district: string; giBrand: string; crafts: string[] }>;
}

const STAGES = [
  { id: 1, title: 'Basic Information', description: 'Product title, description, and categorization' },
  { id: 2, title: 'Pricing & Inventory', description: 'Set prices, inventory, and stock management' },
  { id: 3, title: 'Variants', description: 'Configure product variations and options' },
  { id: 4, title: 'Media & SEO', description: 'Upload images, documents, and SEO settings' },
  { id: 5, title: 'Review & Submit', description: 'Review all information before submission' },
];

// Stable Focus Input Component
const StableFocusInput = ({ 
  field, 
  type = 'text', 
  placeholder, 
  className,
  onFocus,
  onBlur,
  ...props 
}: any) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hasFocus, setHasFocus] = useState(false);

  useEffect(() => {
    if (hasFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasFocus]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setHasFocus(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setHasFocus(false);
    if (onBlur) onBlur(e);
    if (field?.onBlur) field.onBlur(e);
  };

  const setRef = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof field?.ref === 'function') {
      field.ref(el);
    }
  };

  return (
    <Input
      ref={setRef}
      type={type}
      placeholder={placeholder}
      className={cn('transition-all duration-200', className, {
        'ring-2 ring-primary ring-offset-2': hasFocus,
      })}
      name={field?.name}
      value={field?.value}
      onChange={field?.onChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
};

// Stable Focus Textarea Component
const StableFocusTextarea = ({ 
  field, 
  placeholder, 
  className,
  onFocus,
  onBlur,
  ...props 
}: any) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [hasFocus, setHasFocus] = useState(false);

  useEffect(() => {
    if (hasFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [hasFocus]);

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setHasFocus(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setHasFocus(false);
    if (onBlur) onBlur(e);
    if (field?.onBlur) field.onBlur(e);
  };

  const setRef = (el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    if (typeof field?.ref === 'function') {
      field.ref(el);
    }
  };

  return (
    <Textarea
      ref={setRef}
      placeholder={placeholder}
      className={cn('transition-all duration-200', className, {
        'ring-2 ring-primary ring-offset-2': hasFocus,
      })}
      name={field?.name}
      value={field?.value}
      onChange={field?.onChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
};

export default function ComprehensiveProductForm({
  onSubmit,
  onCancel,
  initialData,
  storeId,
  categories,
}: ComprehensiveProductFormProps) {
  const { toast } = useToast();
  const [currentStage, setCurrentStage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<ComprehensiveProductFormValues>({
    resolver: zodResolver(comprehensiveProductSchema),
    defaultValues: initialData || {
      stage1: {
        title: '',
        description: '',
        category: '',
        district: '',
        giBrand: '',
        tags: [],
      },
      stage2: {
        basePrice: '',
        compareAtPrice: '',
        costPerItem: '',
        inventoryTracking: true,
        stockQuantity: '',
        sku: '',
        barcode: '',
        allowBackorders: false,
        lowStockWarning: '',
      },
      stage3: {
        hasVariants: false,
        variantAttributes: [],
        variants: [],
      },
      stage4: {
        images: [],
        documents: [],
        specifications: [],
        seoTitle: '',
        seoDescription: '',
        shippingWeight: '',
        shippingDimensions: {
          length: '',
          width: '',
          height: '',
        },
      },
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: 'stage3.variants',
  });

  const { fields: specFields, append: appendSpec, remove: removeSpec } = useFieldArray({
    control: form.control,
    name: 'stage4.specifications',
  });

  // Auto-save functionality
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (currentStage < 5) {
        setAutoSaveStatus('saving');
        localStorage.setItem('product-form-draft', JSON.stringify(value));
        setTimeout(() => setAutoSaveStatus('saved'), 1000);
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, currentStage]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('product-form-draft');
    if (draft && !initialData) {
      try {
        const parsedDraft = JSON.parse(draft);
        Object.keys(parsedDraft).forEach((key) => {
          if (parsedDraft[key]) {
            form.setValue(key as any, parsedDraft[key]);
          }
        });
        if (parsedDraft.stage4?.images) {
          setUploadedImages(parsedDraft.stage4.images);
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, []);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`/api/upload/product-images?storeId=${storeId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload images');
      }

      const data = await response.json();
      const newImages = [...uploadedImages, ...data.images];
      setUploadedImages(newImages);
      form.setValue('stage4.images', newImages);
      
      toast({
        title: 'Images uploaded',
        description: `Successfully uploaded ${data.images.length} image(s)`,
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    form.setValue('stage4.images', newImages);
  };

  const validateCurrentStage = async () => {
    let stageData: any;
    switch (currentStage) {
      case 1:
        stageData = form.getValues('stage1');
        break;
      case 2:
        stageData = form.getValues('stage2');
        break;
      case 3:
        stageData = form.getValues('stage3');
        break;
      case 4:
        stageData = form.getValues('stage4');
        break;
      default:
        return true;
    }

    try {
      switch (currentStage) {
        case 1:
          await stage1Schema.parseAsync(stageData);
          break;
        case 2:
          await stage2Schema.parseAsync(stageData);
          break;
        case 3:
          await stage3Schema.parseAsync(stageData);
          break;
        case 4:
          await stage4Schema.parseAsync(stageData);
          break;
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStage();
    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields before proceeding',
        variant: 'destructive',
      });
      return;
    }

    if (currentStage < 5) {
      setCurrentStage(currentStage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStage > 1) {
      setCurrentStage(currentStage - 1);
    }
  };

  const handleSubmit = async (data: ComprehensiveProductFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      localStorage.removeItem('product-form-draft');
      toast({
        title: 'Success',
        description: 'Product created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStage1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Provide essential details about your product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="stage1.title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Title *</FormLabel>
                <FormControl>
                  <StableFocusInput
                    field={field}
                    placeholder="Handcrafted Multani Blue Pottery Vase"
                    data-testid="input-product-title"
                  />
                </FormControl>
                <FormDescription>
                  A clear, descriptive title that helps customers find your product
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stage1.description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Description *</FormLabel>
                <FormControl>
                  <StableFocusTextarea
                    field={field}
                    placeholder="Describe your product in detail..."
                    className="min-h-32"
                    data-testid="input-product-description"
                  />
                </FormControl>
                <FormDescription>
                  Include materials, dimensions, care instructions, and unique features
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="stage1.district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-product-district">
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
              name="stage1.giBrand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GI Brand *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-product-gi-brand">
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
                  <FormDescription>Geographical Indication certified brand</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="stage1.category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Category *</FormLabel>
                <FormControl>
                  <StableFocusInput
                    field={field}
                    placeholder="e.g., Home Decor, Jewelry, Textiles"
                    data-testid="input-product-category"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderStage2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Pricing & Inventory</CardTitle>
          <CardDescription>Set your pricing strategy and manage inventory</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="stage2.basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Price (PKR) *</FormLabel>
                  <FormControl>
                    <StableFocusInput
                      field={field}
                      type="number"
                      placeholder="1500"
                      data-testid="input-product-price"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stage2.compareAtPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compare at Price (PKR)</FormLabel>
                  <FormControl>
                    <StableFocusInput
                      field={field}
                      type="number"
                      placeholder="2000"
                      data-testid="input-compare-price"
                    />
                  </FormControl>
                  <FormDescription>Original price for discount display</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="stage2.costPerItem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost per Item (PKR)</FormLabel>
                  <FormControl>
                    <StableFocusInput
                      field={field}
                      type="number"
                      placeholder="1000"
                      data-testid="input-cost-per-item"
                    />
                  </FormControl>
                  <FormDescription>For profit calculation</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stage2.stockQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Quantity *</FormLabel>
                  <FormControl>
                    <StableFocusInput
                      field={field}
                      type="number"
                      placeholder="10"
                      data-testid="input-product-stock"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="stage2.sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                  <FormControl>
                    <StableFocusInput
                      field={field}
                      placeholder="SKU-001"
                      data-testid="input-product-sku"
                    />
                  </FormControl>
                  <FormDescription>Unique identifier for inventory tracking</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stage2.barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode (ISBN, UPC, GTIN)</FormLabel>
                  <FormControl>
                    <StableFocusInput
                      field={field}
                      placeholder="1234567890123"
                      data-testid="input-product-barcode"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center space-x-4">
            <FormField
              control={form.control}
              name="stage2.allowBackorders"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="rounded border-gray-300"
                    />
                  </FormControl>
                  <FormLabel className="!mb-0">Allow backorders when out of stock</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderStage3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Product Variants</CardTitle>
          <CardDescription>Create variations of your product (size, color, material, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="stage3.hasVariants"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="rounded border-gray-300"
                  />
                </FormControl>
                <FormLabel className="!mb-0">This product has multiple variants</FormLabel>
              </FormItem>
            )}
          />

          {form.watch('stage3.hasVariants') && (
            <>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="stage3.variantAttributes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variant Attributes</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Size, Color, Material (comma-separated)"
                          value={field.value?.join(', ') || ''}
                          onChange={(e) => {
                            const attributes = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            field.onChange(attributes);
                          }}
                          data-testid="input-variant-attributes"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the types of variations (e.g., Size, Color, Material)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Variants</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      appendVariant({
                        name: '',
                        size: '',
                        color: '',
                        material: '',
                        attributes: [],
                        price: '',
                        stock: '',
                        sku: '',
                        images: [],
                        isActive: true,
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Variant
                  </Button>
                </div>

                <div className="space-y-4">
                  {variantFields.map((variant, index) => (
                    <Card key={variant.id} className="p-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h5 className="font-medium">Variant {index + 1}</h5>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariant(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <FormField
                          control={form.control}
                          name={`stage3.variants.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Variant Name *</FormLabel>
                              <FormControl>
                                <StableFocusInput 
                                  field={field} 
                                  placeholder="Large Blue Cotton" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`stage3.variants.${index}.size`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Size</FormLabel>
                                <FormControl>
                                  <StableFocusInput 
                                    field={field} 
                                    placeholder="Large, Medium, Small" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`stage3.variants.${index}.color`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Color</FormLabel>
                                <FormControl>
                                  <StableFocusInput 
                                    field={field} 
                                    placeholder="Blue, Red, Green" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`stage3.variants.${index}.material`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Material</FormLabel>
                                <FormControl>
                                  <StableFocusInput 
                                    field={field} 
                                    placeholder="Cotton, Silk, Wool" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`stage3.variants.${index}.price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price (PKR) *</FormLabel>
                                <FormControl>
                                  <StableFocusInput 
                                    field={field} 
                                    type="number" 
                                    placeholder="1500" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`stage3.variants.${index}.stock`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stock *</FormLabel>
                                <FormControl>
                                  <StableFocusInput 
                                    field={field} 
                                    type="number" 
                                    placeholder="10" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`stage3.variants.${index}.sku`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU</FormLabel>
                              <FormControl>
                                <StableFocusInput 
                                  field={field} 
                                  placeholder="SKU-VAR-001" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderStage4 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Product Images & Media</CardTitle>
          <CardDescription>Upload high-quality images and supporting documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="stage4.images"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Images *</FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    <Input 
                      type="file" 
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      multiple
                      max={10}
                      onChange={(e) => handleImageUpload(e.target.files)}
                      disabled={isUploading}
                      data-testid="input-product-images"
                    />
                    {isUploading && (
                      <p className="text-sm text-muted-foreground">Uploading images...</p>
                    )}
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {uploadedImages.map((img, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={normalizeImagePath(img)} 
                              alt={`Product ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  Upload up to 10 images (JPEG, PNG, WebP). Max 5MB per image. First image will be the main product image.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO & Shipping</CardTitle>
          <CardDescription>Optimize for search engines and configure shipping</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="stage4.seoTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEO Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Handcrafted Multani Blue Pottery Vase | Punjab Handicrafts" />
                </FormControl>
                <FormDescription>
                  Optimized title for search engines (max 60 characters)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stage4.seoDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEO Description</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Authentic Multani blue pottery vase handcrafted by skilled artisans in Punjab. Perfect for home decoration."
                    className="min-h-20"
                  />
                </FormControl>
                <FormDescription>
                  Compelling description for search results (max 160 characters)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="stage4.shippingWeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping Weight (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} placeholder="0.5" step="0.1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Shipping Dimensions (cm)</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="stage4.shippingDimensions.length"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Length" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stage4.shippingDimensions.width"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Width" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stage4.shippingDimensions.height"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Height" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderStage5 = () => {
    const formData = form.getValues();
    
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Review Your Product</CardTitle>
            <CardDescription>Please review all information before submitting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information Review */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Basic Information</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStage(1)}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">{formData.stage1.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{formData.stage1.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">District</p>
                  <p className="font-medium">{formData.stage1.district}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GI Brand</p>
                  <p className="font-medium">{formData.stage1.giBrand}</p>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Description</p>
                <p className="text-sm">{formData.stage1.description}</p>
              </div>
            </div>

            {/* Pricing & Inventory Review */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Pricing & Inventory</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStage(2)}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Base Price</p>
                  <p className="font-medium">PKR {formData.stage2.basePrice}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock Quantity</p>
                  <p className="font-medium">{formData.stage2.stockQuantity} units</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-medium">{formData.stage2.sku || 'Not set'}</p>
                </div>
              </div>
            </div>

            {/* Variants Review */}
            {formData.stage3.hasVariants && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">Product Variants</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStage(3)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.stage3.variants?.map((variant, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{variant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Price: PKR {variant.price} | Stock: {variant.stock} units
                        </p>
                      </div>
                      {variant.isActive ? (
                        <Badge className="bg-green-500/10 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {variant.size && (
                        <div>
                          <span className="text-muted-foreground">Size: </span>
                          <span className="font-medium">{variant.size}</span>
                        </div>
                      )}
                      {variant.color && (
                        <div>
                          <span className="text-muted-foreground">Color: </span>
                          <span className="font-medium">{variant.color}</span>
                        </div>
                      )}
                      {variant.material && (
                        <div>
                          <span className="text-muted-foreground">Material: </span>
                          <span className="font-medium">{variant.material}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}

            {/* Media Review */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Product Images</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStage(4)}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {formData.stage4.images?.map((img, index) => (
                  <img
                    key={index}
                    src={normalizeImagePath(img)}
                    alt={`Product ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isSubmitting}
                className="min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Submit Product
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Add New Product</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {autoSaveStatus === 'saving' && <Save className="w-4 h-4 animate-spin" />}
            {autoSaveStatus === 'saved' && <Check className="w-4 h-4 text-green-500" />}
            <span>
              {autoSaveStatus === 'saving' && 'Saving...'}
              {autoSaveStatus === 'saved' && 'Saved'}
              {autoSaveStatus === 'idle' && 'Auto-save enabled'}
            </span>
          </div>
        </div>
        
        {/* Stage Progress */}
        <div className="space-y-2">
          <Progress value={(currentStage / 5) * 100} className="h-2" />
          <div className="flex justify-between text-sm">
            {STAGES.map((stage) => (
              <div
                key={stage.id}
                className={cn(
                  'text-center cursor-pointer transition-colors',
                  currentStage === stage.id ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setCurrentStage(stage.id)}
              >
                <div className="font-medium">{stage.title}</div>
                <div className="text-xs hidden md:block">{stage.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <AnimatePresence mode="wait">
            {currentStage === 1 && renderStage1()}
            {currentStage === 2 && renderStage2()}
            {currentStage === 3 && renderStage3()}
            {currentStage === 4 && renderStage4()}
            {currentStage === 5 && renderStage5()}
          </AnimatePresence>

          {/* Navigation Buttons */}
          {currentStage < 5 && (
            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStage === 1}
                className="min-w-32"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleNext}
                className="min-w-32"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </form>
      </Form>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Product Creation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel? Your progress will be saved as a draft and you can continue later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel}>
              Cancel and Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}