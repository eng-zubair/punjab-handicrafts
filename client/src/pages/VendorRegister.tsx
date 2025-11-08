import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Store, Loader2 } from "lucide-react";

const districts = [
  { district: "Lahore", giBrand: "Lahore Heritage Crafts" },
  { district: "Gujranwala", giBrand: "Punjab Metal & Leather Works" },
  { district: "Rawalpindi", giBrand: "Pothohari Crafts" },
  { district: "Sahiwal", giBrand: "Sufi Craft Collection" },
  { district: "Faisalabad", giBrand: "Faisalabadi Weaves" },
  { district: "D.G. Khan", giBrand: "Saraiki Tribal Arts" },
  { district: "Bahawalpur", giBrand: "Cholistani Heritage" },
  { district: "Sargodha", giBrand: "Salt & Stone Crafts" },
  { district: "Multan", giBrand: "Multani Crafts" },
];

export default function VendorRegister() {
  const { user, isAuthenticated, isVendor, login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedGIBrands, setSelectedGIBrands] = useState<string[]>([]);

  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; district: string; giBrands: string[] }) => {
      const res = await apiRequest("POST", "/api/auth/register-vendor", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Registration Successful",
        description: "Your vendor application has been submitted for review. You'll be notified once approved.",
      });
      setLocation("/vendor/dashboard");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Failed to register as vendor. Please try again.",
      });
    },
  });

  const handleGIBrandToggle = (giBrand: string) => {
    setSelectedGIBrands((prev) =>
      prev.includes(giBrand) ? prev.filter((b) => b !== giBrand) : [...prev, giBrand]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Store name is required",
      });
      return;
    }

    if (!selectedDistrict) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select your district",
      });
      return;
    }

    if (selectedGIBrands.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select at least one GI brand",
      });
      return;
    }

    registerMutation.mutate({
      name: storeName,
      description,
      district: selectedDistrict,
      giBrands: selectedGIBrands,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader className="space-y-2 text-center">
            <Store className="w-12 h-12 mx-auto text-primary" />
            <CardTitle>Become a Vendor</CardTitle>
            <CardDescription>
              You need to be logged in to register as a vendor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={login} className="w-full" data-testid="button-login-vendor">
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isVendor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader className="space-y-2 text-center">
            <Store className="w-12 h-12 mx-auto text-primary" />
            <CardTitle>Already a Vendor</CardTitle>
            <CardDescription>
              You're already registered as a vendor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/vendor/dashboard")} className="w-full" data-testid="button-goto-dashboard">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableGIBrands = selectedDistrict
    ? districts.filter((d) => d.district === selectedDistrict).map((d) => d.giBrand)
    : [];

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Register as Vendor</CardTitle>
                <CardDescription>
                  Create your store and start selling Punjab's authentic handicrafts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name *</Label>
                <Input
                  id="storeName"
                  placeholder="Enter your store name"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  data-testid="input-store-name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Store Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell customers about your crafts and heritage..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  data-testid="textarea-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District *</Label>
                <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                  <SelectTrigger id="district" data-testid="select-district">
                    <SelectValue placeholder="Select your district" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((d) => (
                      <SelectItem key={d.district} value={d.district}>
                        {d.district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDistrict && (
                <div className="space-y-3">
                  <Label>GI Brands for {selectedDistrict} *</Label>
                  <p className="text-sm text-muted-foreground">
                    Select the Geographical Indication brands you'll be selling
                  </p>
                  <div className="space-y-2">
                    {availableGIBrands.map((giBrand) => (
                      <div key={giBrand} className="flex items-center space-x-2">
                        <Checkbox
                          id={`gi-${giBrand}`}
                          checked={selectedGIBrands.includes(giBrand)}
                          onCheckedChange={() => handleGIBrandToggle(giBrand)}
                          data-testid={`checkbox-gi-${giBrand.toLowerCase().replace(/\s+/g, '-')}`}
                        />
                        <Label
                          htmlFor={`gi-${giBrand}`}
                          className="font-normal cursor-pointer"
                        >
                          {giBrand}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-muted/50 p-4 rounded-md space-y-2">
                <h4 className="font-semibold text-sm">Important Notes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your store will be reviewed by our team before approval</li>
                  <li>• Only authentic GI-certified products can be listed</li>
                  <li>• You'll be notified via email about your approval status</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
                data-testid="button-submit-vendor-registration"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  "Submit Vendor Application"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
