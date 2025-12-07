import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ShippingValues = {
  recipientName: string;
  recipientEmail: string;
  phoneNumber: string;
  shippingStreet: string;
  shippingApartment: string;
  shippingCity: string;
  shippingProvince: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingAddress: string;
  shippingMethod?: string;
  specialInstructions?: string;
  billingSame?: boolean;
  billingStreet?: string;
  billingApartment?: string;
  billingCity?: string;
  billingProvince?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  saveInfo?: boolean;
};

export default function ShippingForm({
  values,
  errors = {},
  onChange,
  showBilling = true,
  showSaveInfo = true,
  showMethod = true,
}: {
  values: ShippingValues;
  errors?: Record<string, string>;
  onChange: (patch: Partial<ShippingValues>) => void;
  showBilling?: boolean;
  showSaveInfo?: boolean;
  showMethod?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Input placeholder="Recipient full name" value={values.recipientName} onChange={(e) => onChange({ recipientName: e.target.value })} autoComplete="name" />
          {errors.recipientName && <div className="text-red-600 text-xs mt-1">{errors.recipientName}</div>}
        </div>
        <div>
          <Input placeholder="Contact number" value={values.phoneNumber} onChange={(e) => onChange({ phoneNumber: e.target.value })} data-testid="input-phone" autoComplete="tel" />
        </div>
        <div>
          <Input placeholder="Email address" value={values.recipientEmail} onChange={(e) => onChange({ recipientEmail: e.target.value })} autoComplete="email" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Input placeholder="Street address" value={values.shippingStreet} onChange={(e) => onChange({ shippingStreet: e.target.value })} autoComplete="address-line1" />
          {errors.shippingStreet && <div className="text-red-600 text-xs mt-1">{errors.shippingStreet}</div>}
        </div>
        <div>
          <Input placeholder="Apartment/suite (optional)" value={values.shippingApartment} onChange={(e) => onChange({ shippingApartment: e.target.value })} autoComplete="address-line2" />
        </div>
        <div>
          <Input placeholder="City" value={values.shippingCity} onChange={(e) => onChange({ shippingCity: e.target.value })} autoComplete="address-level2" />
          {errors.shippingCity && <div className="text-red-600 text-xs mt-1">{errors.shippingCity}</div>}
        </div>
        <div>
          <select className="border rounded h-10 px-3" value={values.shippingProvince} onChange={(e) => onChange({ shippingProvince: e.target.value })} aria-label="State/Province">
            <option value="">Select Province</option>
            <option value="Punjab">Punjab</option>
            <option value="Sindh">Sindh</option>
            <option value="Balochistan">Balochistan</option>
            <option value="Khyber Pakhtunkhwa">KPK Khaiber Pakhtoon Khah</option>
            <option value="Islamabad">Islamabad Capital Territory</option>
          </select>
          {errors.shippingProvince && <div className="text-red-600 text-xs mt-1">{errors.shippingProvince}</div>}
        </div>
        <div>
          <Input placeholder="Postal/ZIP code" value={values.shippingPostalCode} onChange={(e) => onChange({ shippingPostalCode: e.target.value })} autoComplete="postal-code" />
        </div>
        <div>
          <Input placeholder="Country" value={values.shippingCountry} onChange={(e) => onChange({ shippingCountry: e.target.value })} autoComplete="country-name" />
        </div>
      </div>
      {showMethod && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <select className="border rounded h-10 px-3" value={values.shippingMethod || "standard"} onChange={(e) => onChange({ shippingMethod: e.target.value })} aria-label="Delivery method">
              <option value="standard">Standard</option>
              <option value="express">Express</option>
            </select>
          </div>
          <div>
            <Input placeholder="Special instructions (optional)" value={values.specialInstructions || ""} onChange={(e) => onChange({ specialInstructions: e.target.value })} />
          </div>
        </div>
      )}
      {showBilling && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!values.billingSame} onChange={(e) => onChange({ billingSame: e.target.checked })} /> Same as shipping</label>
          {!values.billingSame && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Input placeholder="Billing street" value={values.billingStreet || ""} onChange={(e) => onChange({ billingStreet: e.target.value })} />
                {errors.billingStreet && <div className="text-red-600 text-xs mt-1">{errors.billingStreet}</div>}
              </div>
              <div>
                <Input placeholder="Apartment/suite (optional)" value={values.billingApartment || ""} onChange={(e) => onChange({ billingApartment: e.target.value })} />
              </div>
              <div>
                <Input placeholder="City" value={values.billingCity || ""} onChange={(e) => onChange({ billingCity: e.target.value })} />
                {errors.billingCity && <div className="text-red-600 text-xs mt-1">{errors.billingCity}</div>}
              </div>
              <div>
                <Input placeholder="Province" value={values.billingProvince || ""} onChange={(e) => onChange({ billingProvince: e.target.value })} />
                {errors.billingProvince && <div className="text-red-600 text-xs mt-1">{errors.billingProvince}</div>}
              </div>
              <div>
                <Input placeholder="Postal code" value={values.billingPostalCode || ""} onChange={(e) => onChange({ billingPostalCode: e.target.value })} />
              </div>
              <div>
                <Input placeholder="Country" value={values.billingCountry || "Pakistan"} onChange={(e) => onChange({ billingCountry: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      )}
      {showSaveInfo && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!values.saveInfo} onChange={(e) => onChange({ saveInfo: e.target.checked })} /> Save information for next checkout</label>
      )}
    </div>
  );
}
