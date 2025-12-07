import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "PKR 0 / mo",
    features: ["Up to 10 products", "Standard listing", "Email support"],
    highlight: false,
  },
  {
    id: "standard",
    name: "Standard",
    price: "PKR 2,000 / mo",
    features: ["Up to 100 products", "Featured placement", "Priority support"],
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "PKR 5,000 / mo",
    features: ["Unlimited products", "Homepage feature", "Dedicated manager"],
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-4xl font-bold" data-testid="heading-pricing">Vendor Pricing</h1>
            <p className="text-muted-foreground">Choose a plan that fits your marketplace needs</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={plan.highlight ? "border-primary" : undefined}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.highlight && <Badge>Popular</Badge>}
                  </div>
                  <p className="text-2xl font-semibold mt-2">{plan.price}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/vendor/register?tier=${plan.id}`}>
                    <Button className="w-full" data-testid={`cta-${plan.id}`}>Get Started</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}