import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground">Your privacy, protected and respected</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>We collect information you provide directly, including name, email, phone number, shipping and billing addresses, account credentials, and order details. We also collect information automatically through cookies and similar technologies, including device identifiers, browser type, pages viewed, interactions, approximate location, and referrer.</p>
                <p>When you contact support, participate in promotions, leave reviews, or interact with vendors, we collect the content of your communications and related metadata.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>We use information to process orders, provide and improve services, personalize content, communicate with you about purchases and updates, prevent fraud and abuse, comply with legal obligations, and analyze usage to enhance customer experience.</p>
                <p>Processing is based on contractual necessity, legitimate interests (such as improving services and securing our platform), consent where required (such as certain marketing and analytics), and legal obligations.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cookies and Similar Technologies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>We use cookies, pixels, and local storage to operate the site, remember preferences, measure performance, and deliver relevant content. Categories include strictly necessary, functional, analytics, and advertising cookies.</p>
                <p>You can manage cookies via your browser settings and applicable consent tools. Disabling certain cookies may impact site functionality.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sharing with Third Parties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>We share information with service providers who assist in payment processing, order fulfillment and shipping, fraud prevention, analytics, customer support, and hosting. These parties are bound by contractual obligations to protect your data and use it only on our instructions.</p>
                <p>We may disclose information to comply with laws, enforce policies, protect rights, or in connection with corporate transactions. We do not sell personal information in the sense of CCPA. Where applicable, you may opt-out of targeted advertising and certain data sharing.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Storage, Security, and Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>We employ administrative, technical, and physical safeguards appropriate to the sensitivity of the data, including encryption in transit, access controls, audit logging, and secure development practices.</p>
                <p>Data is retained for as long as needed to provide services, fulfill legal and accounting requirements, resolve disputes, and enforce agreements. Where feasible, we anonymize or aggregate data.</p>
                <p>If data is transferred internationally, we rely on appropriate safeguards and agreements consistent with applicable laws.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>Subject to applicable law, you may have rights to access, correct, delete, restrict, or object to processing of your personal information, and to receive a portable copy. You may also withdraw consent for processing where consent is the basis.</p>
                <p>Under CCPA/CPRA, California residents may request disclosures about data practices, access or deletion of personal information, and opt-out of certain sharing. We do not discriminate for exercising privacy rights.</p>
                <p>To exercise rights, contact us using the information below. We may need to verify your identity and request details necessary to fulfill your request within statutory timelines.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Children’s Privacy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>Our services are not directed to children. We do not knowingly collect personal information from children under the age required by applicable law. If you believe a child has provided personal information, contact us to request deletion.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Changes to This Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>We may update this Privacy Policy to reflect changes in practices or legal requirements. Updates will be posted here with an updated date. Continued use of the services signifies acceptance of the updated policy.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact for Privacy Concerns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>Email: privacy@sanatzar.pk</p>
                <p>Address: Sanatzar, Lahore, Pakistan</p>
                <p>If you have questions about this policy or wish to exercise your rights, contact us using the details above.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

