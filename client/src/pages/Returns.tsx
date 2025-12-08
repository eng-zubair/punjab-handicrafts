import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Returns() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Returns & Refunds</h1>
              <p className="text-muted-foreground">Easy, clear, and customer-friendly</p>
            </div>
            <Button variant="outline" onClick={() => setLocation('/orders')}>View Orders</Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Eligible Return Timeframes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>Items are eligible for return within 30 days of purchase date shown on your receipt or order details. The return window begins on the date of delivery for shipped orders or on the date of purchase for in-store transactions.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Return Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Items must be unused, in original packaging, with all tags and accessories.</li>
                  <li>Include proof of purchase (order confirmation or receipt).</li>
                  <li>Products returned in non-original or damaged packaging may be subject to a restocking fee or be deemed ineligible.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How to Initiate a Return</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <div>
                  <p className="font-medium">Online Returns</p>
                  <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Go to the Orders page and select the item you wish to return.</li>
                    <li>Click Request Return and choose the reason.</li>
                    <li>Follow instructions to print a return label or schedule a pickup where available.</li>
                    <li>Pack the item securely and attach the label. Ship within 7 days of approval.</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium">In-Store Returns</p>
                  <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Bring the item and proof of purchase to a participating vendor store.</li>
                    <li>A representative will inspect the item and process the return if eligible.</li>
                    <li>Refunds for in-store returns are issued to the original payment method.</li>
                  </ol>
                </div>
                <p>For assistance, contact returns@sanatzar.pk or call customer support.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Refunds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>Refunds are processed within 5–10 business days after the returned item is received and inspected. Processing times may vary based on your bank or payment provider.</p>
                <p>Original shipping fees are non-refundable unless the return is due to a defective or incorrect item.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exceptions and Special Cases</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Personalized, custom-made, or final-sale items may not be eligible for return.</li>
                  <li>Perishable, hygiene-sensitive, and intimate items are not returnable unless defective.</li>
                  <li>Electronics and machinery may require inspection and can be subject to a restocking fee.</li>
                  <li>Defective or damaged-on-arrival items qualify for exchange or refund; report within 7 days.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>Email: returns@sanatzar.pk</p>
                <p>Phone: +92-300-0000000</p>
                <p>For any return-related inquiries, reach out and our team will assist.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

