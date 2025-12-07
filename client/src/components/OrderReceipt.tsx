import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils/price";
import { normalizeImagePath } from "@/lib/utils/image";
import React from "react";

type ReceiptItem = {
  productTitle: string;
  productImage: string | null;
  storeName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

type ReceiptBuyer = { firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null } | null;

type ReceiptData = {
  orderId: string;
  receiptNumber: string | null;
  createdAt: string;
  paymentMethod: string | null;
  shippingMethod: string | null;
  estimatedDelivery: string | null;
  buyer: ReceiptBuyer;
  shippingAddress: string | null;
  items: ReceiptItem[];
  subtotal: string;
  shippingCost: string;
  taxAmount: string;
  total: string;
};

export default function OrderReceipt({ receipt, onDownloadPdf }: { receipt: ReceiptData; onDownloadPdf?: () => void }) {
  const dt = receipt.createdAt ? new Date(receipt.createdAt) : new Date();
  const dateStr = dt.toLocaleString("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" });
  const payment = (receipt.paymentMethod || "cod").toString();
  const subtotal = parseFloat(String(receipt.subtotal));
  const shipping = parseFloat(String(receipt.shippingCost));
  const taxes = parseFloat(String(receipt.taxAmount));
  const total = parseFloat(String(receipt.total));
  const est = receipt.estimatedDelivery || (payment.toLowerCase() === "cod" ? "3-7 business days" : "—");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Order Confirmed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Order Number</div>
            <div className="font-mono font-semibold">{receipt.orderId.slice(0, 8)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Receipt Number</div>
            <div className="font-mono">{receipt.receiptNumber || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Date and Time</div>
            <div className="font-medium">{dateStr}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Payment</div>
            <div className="font-medium capitalize">{payment}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Shipping Method</div>
            <div className="font-medium capitalize">{(receipt.shippingMethod || 'standard')}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Estimated Delivery</div>
            <div className="font-medium">{est}</div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">A confirmation has been sent. Thank you for your purchase!</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3">
          <div>
            <div className="font-semibold mb-1">Buyer</div>
            <div className="text-xs text-muted-foreground">Name</div>
            <div className="font-medium">{`${(receipt.buyer?.firstName || '')} ${(receipt.buyer?.lastName || '')}`.trim() || '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">Email</div>
            <div className="font-medium">{receipt.buyer?.email || '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">Phone</div>
            <div className="font-medium">{receipt.buyer?.phone || '—'}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">Shipping Address</div>
            <div className="font-medium whitespace-pre-line">{receipt.shippingAddress || '—'}</div>
          </div>
        </div>

        <div className="border-t pt-3 space-y-3">
          <div className="font-semibold">Order Summary</div>
          <div className="space-y-2">
            {receipt.items.map((it, idx) => {
              const img = it.productImage || undefined;
              const title = it.productTitle;
              const lineTotal = parseFloat(String(it.lineTotal));
              return (
                <div key={`${it.storeName}-${title}-${idx}`} className="flex items-center gap-3 py-2 border-b">
                  {img && (
                    <img src={normalizeImagePath(img)} alt={title} className="w-12 h-12 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{title}</div>
                    <div className="text-xs text-muted-foreground">Sold by: {it.storeName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatPrice(lineTotal)}</div>
                    <div className="text-xs text-muted-foreground">Qty: {it.quantity}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Subtotal</span><span className="font-semibold">{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Shipping</span><span className="font-semibold">{formatPrice(shipping)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Taxes</span><span className="font-semibold">{formatPrice(taxes)}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="text-sm">Total</span><span className="font-bold">{formatPrice(total)}</span></div>
          </div>
        </div>

        {onDownloadPdf && (
          <div className="pt-2">
            <Button variant="outline" onClick={onDownloadPdf} data-testid={`button-download-receipt-${receipt.orderId}`}>Download PDF</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
