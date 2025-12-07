import { AdminDashboard } from "./AdminDashboard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Percent, Truck, Lock } from "lucide-react";
import { registerSchema } from "@shared/schema";

interface PlatformSettings {
  id: string;
  taxEnabled: boolean;
  shippingEnabled: boolean;
}

interface TaxRule {
  id: string;
  enabled: boolean;
  category: string | null;
  province: string | null;
  rate: string;
  exempt: boolean;
  priority: number;
}

interface ShippingRateRule {
  id: string;
  enabled: boolean;
  carrier: string;
  method: string;
  zone: string;
  minWeightKg: string;
  maxWeightKg: string;
  baseRate: string;
  perKgRate: string;
  dimensionalFactor?: string | null;
  surcharge?: string | null;
  priority: number;
}

export default function AdminSettings() {
  const { toast } = useToast();

  const { data: platform, isLoading: loadingPlatform } = useQuery<PlatformSettings>({
    queryKey: ["/api/admin/platform/settings"],
  });
  const { data: taxRules = [], isLoading: loadingTax } = useQuery<TaxRule[]>({
    queryKey: ["/api/admin/tax-rules"],
  });
  const { data: shipRules = [], isLoading: loadingShip } = useQuery<ShippingRateRule[]>({
    queryKey: ["/api/admin/shipping-rate-rules"],
  });

  const [taxRate, setTaxRate] = useState<string>("0");
  const [baseRate, setBaseRate] = useState<string>("0");
  const [perKgRate, setPerKgRate] = useState<string>("0");
  const [taxEnabled, setTaxEnabled] = useState<boolean>(true);
  const [shippingEnabled, setShippingEnabled] = useState<boolean>(true);

  const defaultTaxRule = useMemo(() => {
    const candidates = (taxRules || []).filter(r => r.enabled && !r.exempt).filter(r => !r.category || String(r.category).toLowerCase() === "general").filter(r => !r.province);
    return candidates.sort((a, b) => (Number(b.priority || 0) - Number(a.priority || 0)))[0];
  }, [taxRules]);

  const defaultShipRule = useMemo(() => {
    const candidates = (shipRules || []).filter(r => r.enabled).filter(r => String(r.method).toLowerCase() === "standard").filter(r => String(r.zone).toUpperCase() === "PK");
    return candidates.sort((a, b) => (Number(b.priority || 0) - Number(a.priority || 0)))[0];
  }, [shipRules]);

  useEffect(() => {
    if (platform) {
      setTaxEnabled(Boolean(platform.taxEnabled));
      setShippingEnabled(Boolean(platform.shippingEnabled));
    }
  }, [platform]);

  useEffect(() => {
    if (defaultTaxRule) {
      setTaxRate(String(defaultTaxRule.rate ?? "0"));
    }
  }, [defaultTaxRule]);

  useEffect(() => {
    if (defaultShipRule) {
      setBaseRate(String(defaultShipRule.baseRate ?? "0"));
      setPerKgRate(String(defaultShipRule.perKgRate ?? "0"));
    }
  }, [defaultShipRule]);

  const updatePlatformMutation = useMutation({
    mutationFn: async (payload: Partial<PlatformSettings>) => {
      const res = await apiRequest("PUT", "/api/admin/platform/settings", payload);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/platform/settings"] });
      toast({ title: "Settings updated" });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const saveTaxMutation = useMutation({
    mutationFn: async () => {
      const rateNum = parseFloat(String(taxRate));
      if (!Number.isFinite(rateNum) || rateNum < 0) throw new Error("Invalid tax percentage");
      if (defaultTaxRule) {
        const res = await apiRequest("PUT", `/api/admin/tax-rules/${defaultTaxRule.id}`, { rate: rateNum.toFixed(2), enabled: true, exempt: false });
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/admin/tax-rules", { rate: rateNum.toFixed(2), enabled: true, exempt: false, category: "general", province: null, priority: 100 });
        return res.json();
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/tax-rules"] });
      toast({ title: "Tax rule saved" });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const saveShipMutation = useMutation({
    mutationFn: async () => {
      const base = parseFloat(String(baseRate));
      const perKg = parseFloat(String(perKgRate));
      if (!Number.isFinite(base) || base < 0) throw new Error("Invalid base rate");
      if (!Number.isFinite(perKg) || perKg < 0) throw new Error("Invalid per-kg rate");
      if (defaultShipRule) {
        const res = await apiRequest("PUT", `/api/admin/shipping-rate-rules/${defaultShipRule.id}`, { baseRate: base.toFixed(2), perKgRate: perKg.toFixed(2), enabled: true });
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/admin/shipping-rate-rules", { baseRate: base.toFixed(2), perKgRate: perKg.toFixed(2), enabled: true, carrier: "internal", method: "standard", zone: "PK", minWeightKg: "0", maxWeightKg: "999", priority: 100 });
        return res.json();
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping-rate-rules"] });
      toast({ title: "Shipping rate saved" });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const valid = registerSchema.shape.password.safeParse(newPassword);
      if (!valid.success) {
        throw new Error("Password must be at least 8 chars with upper, lower, number");
      }
      const res = await apiRequest("POST", "/api/buyer/password", { currentPassword, newPassword });
      return res.json();
    },
    onSuccess: async () => {
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Password updated" });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  return (
    <AdminDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-settings">Site Settings</h1>
          <p className="text-muted-foreground">Configure platform tax and shipping</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Platform Toggles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPlatform ? (
                <p className="text-muted-foreground">Loading settings...</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="switch-tax">Enable Tax</Label>
                    </div>
                    <Switch id="switch-tax" checked={taxEnabled} onCheckedChange={(v) => { setTaxEnabled(v); updatePlatformMutation.mutate({ taxEnabled: v }); }} data-testid="switch-tax-enabled" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="switch-ship">Enable Shipping</Label>
                    </div>
                    <Switch id="switch-ship" checked={shippingEnabled} onCheckedChange={(v) => { setShippingEnabled(v); updatePlatformMutation.mutate({ shippingEnabled: v }); }} data-testid="switch-shipping-enabled" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Tax Percentage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingTax ? (
                <p className="text-muted-foreground">Loading tax rules...</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="input-tax">Tax %</Label>
                    <Input id="input-tax" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g. 18.00" data-testid="input-tax-rate" />
                  </div>
                  <Button onClick={() => saveTaxMutation.mutate()} disabled={saveTaxMutation.isPending} data-testid="button-save-tax">
                    Save Tax
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Shipping Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingShip ? (
                <p className="text-muted-foreground">Loading shipping rules...</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="input-base">Base Rate (PKR)</Label>
                      <Input id="input-base" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} placeholder="e.g. 150.00" data-testid="input-shipping-base" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="input-perkg">Per KG Rate (PKR)</Label>
                      <Input id="input-perkg" value={perKgRate} onChange={(e) => setPerKgRate(e.target.value)} placeholder="e.g. 50.00" data-testid="input-shipping-perkg" />
                    </div>
                  </div>
                  <Button onClick={() => saveShipMutation.mutate()} disabled={saveShipMutation.isPending} data-testid="button-save-shipping">
                    Save Shipping Rates
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="input-current-password">Current Password</Label>
                <Input
                  id="input-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="input-current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="input-new-password">New Password</Label>
                <Input
                  id="input-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="input-new-password"
                />
              </div>
              <Button
                onClick={() => changePasswordMutation.mutate()}
                disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
                data-testid="button-change-password"
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminDashboard>
  );
}
