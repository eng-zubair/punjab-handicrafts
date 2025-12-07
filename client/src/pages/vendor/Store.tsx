import { VendorDashboard } from "./VendorDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Store as StoreIcon, CheckCircle2, Clock, Lock } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerSchema } from "@shared/schema";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

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

type Category = {
  id: string;
  district: string;
  giBrand: string;
  crafts: string[];
};

const storeFormSchema = z.object({
  name: z.string().min(3, "Store name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  district: z.string().min(1, "Please select a district"),
  giBrands: z.array(z.string()).min(1, "Please select at least one GI brand"),
});

type StoreFormValues = z.infer<typeof storeFormSchema>;

export default function VendorStore() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { data: stores = [], isLoading: loadingStores } = useQuery<Store[]>({
    queryKey: ['/api/vendor/stores'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const store = stores[0];

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: store?.name || "",
      description: store?.description || "",
      district: store?.district || "",
      giBrands: store?.giBrands || [],
    },
  });

  const createStoreMutation = useMutation({
    mutationFn: async (data: StoreFormValues) => {
      return apiRequest('POST', '/api/stores', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/stores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/analytics'] });
      setIsEditing(false);
      toast({
        title: "Store created",
        description: "Your store has been submitted for approval",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: async (data: StoreFormValues) => {
      if (!store) throw new Error("No store found");
      return apiRequest('PUT', `/api/stores/${store.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/stores'] });
      setIsEditing(false);
      toast({
        title: "Store updated",
        description: "Your store information has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const valid = registerSchema.shape.password.safeParse(newPassword);
      if (!valid.success) {
        throw new Error("Password must be at least 8 chars with upper, lower, number");
      }
      const res = await apiRequest("POST", "/api/buyer/password", { currentPassword, newPassword });
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Password updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: StoreFormValues) => {
    if (store) {
      updateStoreMutation.mutate(data);
    } else {
      createStoreMutation.mutate(data);
    }
  };

  const handleEdit = () => {
    if (store) {
      form.reset({
        name: store.name,
        description: store.description || "",
        district: store.district,
        giBrands: store.giBrands,
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (store) {
      form.reset({
        name: store.name,
        description: store.description || "",
        district: store.district,
        giBrands: store.giBrands,
      });
    }
    setIsEditing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" data-testid="badge-store-approved">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400" data-testid="badge-store-pending">
            <Clock className="w-3 h-3 mr-1" />
            Pending Approval
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" data-testid="badge-store-rejected">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const selectedDistrictCategories = categories.filter(
    cat => cat.district === form.watch('district')
  );

  if (loadingStores) {
    return (
      <VendorDashboard>
        <div className="p-6">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </VendorDashboard>
    );
  }

  return (
    <VendorDashboard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-store-settings">Store Settings</h1>
            <p className="text-muted-foreground">Manage your store information and preferences</p>
          </div>
          {store && !isEditing && (
            <Button onClick={handleEdit} data-testid="button-edit-store">
              Edit Store
            </Button>
          )}
        </div>

        {store && store.status === 'pending' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription data-testid="alert-pending-approval">
              Your store is pending approval. Updates will also require re-approval by an admin.
            </AlertDescription>
          </Alert>
        )}

        {store && store.status === 'rejected' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="alert-store-rejected">
              Your store application was rejected. Please contact support for more information or make changes and resubmit.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <StoreIcon className="w-5 h-5" />
                  {store ? 'Store Information' : 'Create Your Store'}
                </CardTitle>
                <CardDescription>
                  {store 
                    ? 'View and update your store details'
                    : 'Set up your store to start selling on Sanatzar'}
                </CardDescription>
              </div>
              {store && getStatusBadge(store.status)}
            </div>
          </CardHeader>
          <CardContent>
            {!store || isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Handicraft Store" {...field} data-testid="input-store-name" />
                        </FormControl>
                        <FormDescription>
                          This will be displayed to customers
                        </FormDescription>
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
                          <Textarea
                            placeholder="Tell customers about your store and crafts..."
                            className="min-h-32"
                            {...field}
                            data-testid="input-store-description"
                          />
                        </FormControl>
                        <FormDescription>
                          Describe your store, your craft heritage, and what makes your products special
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>District</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-store-district">
                              <SelectValue placeholder="Select your district" />
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
                        <FormDescription>
                          Select the district where your crafts originate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="giBrands"
                    render={() => (
                      <FormItem>
                        <FormLabel>GI Brands (Geographical Indication)</FormLabel>
                        <FormDescription>
                          Select the GI certified brands your store will sell
                        </FormDescription>
                        <div className="space-y-3 mt-3">
                          {selectedDistrictCategories.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Please select a district first
                            </p>
                          ) : (
                            selectedDistrictCategories.map((cat) => (
                              <FormField
                                key={cat.giBrand}
                                control={form.control}
                                name="giBrands"
                                render={({ field }) => (
                                  <FormItem className="flex items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(cat.giBrand)}
                                        onCheckedChange={(checked) => {
                                          const updatedValue = checked
                                            ? [...field.value, cat.giBrand]
                                            : field.value.filter(val => val !== cat.giBrand);
                                          field.onChange(updatedValue);
                                        }}
                                        data-testid={`checkbox-gi-brand-${cat.giBrand}`}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="font-normal cursor-pointer">
                                        {cat.giBrand}
                                      </FormLabel>
                                      <p className="text-xs text-muted-foreground">
                                        Crafts: {cat.crafts.join(', ')}
                                      </p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            ))
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={createStoreMutation.isPending || updateStoreMutation.isPending}
                      data-testid="button-submit-store"
                    >
                      {createStoreMutation.isPending || updateStoreMutation.isPending
                        ? "Saving..."
                        : store
                        ? "Update Store"
                        : "Create Store"}
                    </Button>
                    {isEditing && store && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        data-testid="button-cancel-store"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Store Name</h3>
                  <p className="text-base" data-testid="text-store-name">{store.name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                  <p className="text-base" data-testid="text-store-description">
                    {store.description || 'No description provided'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">District</h3>
                  <p className="text-base" data-testid="text-store-district">{store.district}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">GI Brands</h3>
                  <div className="flex flex-wrap gap-2">
                    {store.giBrands.map((brand) => (
                      <Badge key={brand} variant="outline" data-testid={`badge-gi-brand-${brand}`}>
                        {brand}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                  <p className="text-base">
                    {new Date(store.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Account Security
            </CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="input-vendor-current-password">Current Password</Label>
              <Input
                id="input-vendor-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="input-vendor-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input-vendor-new-password">New Password</Label>
              <Input
                id="input-vendor-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="input-vendor-new-password"
              />
            </div>
            <Button
              onClick={() => changePasswordMutation.mutate()}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
              data-testid="button-vendor-change-password"
            >
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </VendorDashboard>
  );
}
