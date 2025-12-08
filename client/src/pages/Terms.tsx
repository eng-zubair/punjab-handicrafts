import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground">Please read these terms carefully</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Introduction and Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>These Terms of Service govern your access to and use of the Sanatzar platform. By creating an account, purchasing products, or otherwise using the services, you agree to be bound by these terms.</p>
                <p>If you do not agree, do not use the services. We may update these terms from time to time; continued use after updates constitutes acceptance.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Responsibilities and Conduct Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Provide accurate information and keep your account credentials secure.</li>
                  <li>Comply with applicable laws and respect intellectual property, privacy, and community standards.</li>
                  <li>Do not engage in fraud, harassment, hate speech, or activities that harm other users, vendors, or the platform.</li>
                  <li>You are responsible for all activity under your account.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intellectual Property Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>All content and materials on the platform, including text, graphics, logos, images, and software, are owned by or licensed to Sanatzar and are protected by intellectual property laws.</p>
                <p>You may not copy, modify, distribute, or create derivative works from any content without prior written authorization.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy Policy Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>For information on how we collect, use, and protect personal data, see our <Link href="/privacy-policy" className="underline">Privacy Policy</Link>. By using the services, you acknowledge the practices described there.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>To the maximum extent permitted by law, Sanatzar is not liable for indirect, incidental, special, consequential, or punitive damages, including lost profits, data, goodwill, or other intangible losses arising from your use of the services.</p>
                <p>Our total liability for any claim is limited to the amount you paid to Sanatzar for the transaction giving rise to the claim.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Termination Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>We may suspend or terminate access to the services for violations of these terms, legal requirements, or to protect platform integrity. You may terminate your account at any time. Certain obligations, including intellectual property and payment obligations, survive termination.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Governing Law and Dispute Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>These terms are governed by the laws of Pakistan, without regard to conflict of law principles. Disputes shall be submitted to the courts located in Lahore, Pakistan, unless otherwise required by applicable consumer protection laws.</p>
                <p>Before filing, parties agree to attempt informal resolution by contacting support.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Modification of Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>We may modify these terms at any time to reflect changes in services or legal requirements. Updates take effect upon posting. Material changes will be communicated through reasonable means.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>Email: support@sanatzar.pk</p>
                <p>Address: Sanatzar, Lahore, Pakistan</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

