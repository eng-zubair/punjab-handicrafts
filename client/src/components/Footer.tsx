import { Separator } from "@/components/ui/separator";
import swdLogo from "@assets/swd.png";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Category } from "@shared/schema";
import { Link } from "wouter";
import { toSlug } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { newsletterSignupSchema, type NewsletterSignupInput } from "@shared/schema";

export default function Footer() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const { toast } = useToast();
  const form = useForm<NewsletterSignupInput>({
    resolver: zodResolver(newsletterSignupSchema),
    defaultValues: { email: "", consent: true },
    mode: "onSubmit",
  });
  const subscribeMutation = useMutation({
    mutationFn: async (data: NewsletterSignupInput) => {
      return apiRequest("POST", "/api/newsletter/subscribe", data);
    },
    onSuccess: async (res: Response) => {
      try {
        await res.json();
      } catch {}
      toast({ title: "Subscribed", description: "You have been subscribed to our newsletter." });
      form.reset({ email: "", consent: true });
    },
    onError: (err: any) => {
      toast({ title: "Subscription failed", description: err.message || "Please try again.", variant: "destructive" });
    },
  });
  const onSubmit = (data: NewsletterSignupInput) => {
    subscribeMutation.mutate(data);
  };
  const giBrands = Array.from(new Set(categories.map(c => c.giBrand))).sort((a, b) => a.localeCompare(b));
  return (
    <footer className="bg-card border-t mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold text-primary mb-4" data-testid="text-footer-logo">
              Sanatzar
            </h3>
            <p className="text-sm text-muted-foreground">
              Connecting Punjab's traditional artisans with the world through authentic GI-branded handicrafts.
            </p>
            <div className="mt-4 max-w-sm" aria-label="Newsletter signup" data-testid="newsletter-section">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            data-testid="newsletter-input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="consent"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={!!field.value}
                              onCheckedChange={(v: boolean) => field.onChange(Boolean(v))}
                              aria-label="Agree to privacy policy"
                              data-testid="newsletter-checkbox-consent"
                            />
                          </FormControl>
                          <FormLabel className="text-sm">
                            I agree to the{" "}
                            <Link href="/privacy-policy" className="underline">Privacy Policy</Link>
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={subscribeMutation.isPending}
                    data-testid="newsletter-submit"
                  >
                    {subscribeMutation.isPending ? "Subscribing..." : "Subscribe"}
                  </Button>
                </form>
              </Form>
            </div>
            <img src={swdLogo} alt="Official Logo" className="h-20 w-auto" loading="lazy" decoding="async" />
          </div>

          <div>
            <h4 className="font-semibold mb-4">GI Brands</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {giBrands.map((brand) => (
                <li key={brand}>
                  <Link href={`/brands/${toSlug(brand)}`} className="hover:text-foreground transition-colors">
                    {brand}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Artisans</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/vendor/register" className="hover:text-foreground transition-colors">Create Store</Link></li>
              <li><Link href="/artisan/register" className="hover:text-foreground transition-colors">Register as Artisan</Link></li>
              <li><Link href="/training" className="hover:text-foreground transition-colors">Training Programs</Link></li>
              <li><Link href="/vendor/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/vendor/guide" className="hover:text-foreground transition-colors">Seller Guide</Link></li>
              <li><Link href="/vendor/verification" className="hover:text-foreground transition-colors">GI Verification</Link></li>
              <li><Link href="/training" className="hover:text-foreground transition-colors">Artisan Training</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Shipping Info</a></li>
              <li><Link href="/returns" className="hover:text-foreground transition-colors">Returns</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2025 Sanatzar. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>

          </div>
        </div>
      </div>
    </footer>
  );
}
