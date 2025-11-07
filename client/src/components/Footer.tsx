import { Separator } from "@/components/ui/separator";

export default function Footer() {
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
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Shop by District</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Lahore</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Multan</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Bahawalpur</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Faisalabad</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">For Vendors</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Create Store</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Seller Guide</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">GI Verification</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Shipping Info</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Returns</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>
        
        <Separator className="my-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2025 Sanatzar. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
