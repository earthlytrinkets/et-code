import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-16 lg:px-8">
      <h1 className="font-display text-3xl font-bold text-foreground">Privacy Policy</h1>
      <p className="mt-2 font-body text-xs text-muted-foreground">Last updated: 29 March 2026</p>

      <div className="mt-8 max-w-2xl space-y-8 font-body text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Information We Collect</h2>
          <p>When you use Earthly Trinkets, we may collect:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Account information:</strong> name, email address, and profile photo (via Google sign-in or email signup).</li>
            <li><strong>Delivery addresses:</strong> provided by you during checkout.</li>
            <li><strong>Order details:</strong> items purchased, payment method, and transaction IDs.</li>
            <li><strong>Newsletter subscription:</strong> your email address if you subscribe to updates.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">How We Use Your Information</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To process and deliver your orders.</li>
            <li>To send order confirmations, shipping updates, and welcome emails.</li>
            <li>To send newsletter notifications (new products, price drops) — only if you've subscribed.</li>
            <li>To improve our website and customer experience.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Third-Party Services</h2>
          <p>We use the following trusted third-party services:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Supabase:</strong> authentication and database hosting.</li>
            <li><strong>Razorpay:</strong> secure payment processing. We do not store your card or bank details.</li>
            <li><strong>Shiprocket:</strong> shipping and delivery logistics.</li>
            <li><strong>Resend:</strong> transactional and newsletter emails.</li>
            <li><strong>Google OAuth:</strong> sign-in via your Google account.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Data Security</h2>
          <p>
            Your data is stored securely on Supabase with Row Level Security (RLS) policies ensuring users can only access their own data. Payment processing is handled entirely by Razorpay — we never see or store your payment credentials.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Newsletter & Unsubscribe</h2>
          <p>
            If you subscribe to our newsletter, you can unsubscribe at any time using the unsubscribe link in any email. You can also contact us to have your subscription removed.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Your Rights</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>You can update your profile information from your Profile page.</li>
            <li>You can request deletion of your account and data by contacting us.</li>
            <li>You can unsubscribe from newsletters at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Contact</h2>
          <p>
            For any privacy-related questions, reach out to us at{" "}
            <a href="mailto:business.earthlytrinkets@gmail.com" className="text-primary hover:underline">
              business.earthlytrinkets@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export default PrivacyPolicy;
