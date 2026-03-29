import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ShippingReturns = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-16 lg:px-8">
      <h1 className="font-display text-3xl font-bold text-foreground">Shipping & Returns</h1>
      <div className="mt-8 max-w-2xl space-y-8 font-body text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Shipping</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>We ship across India via Shiprocket's courier partners.</li>
            <li>Orders are processed within 1–3 business days.</li>
            <li>Standard delivery takes 5–7 business days depending on your location.</li>
            <li>You'll receive a tracking link via email once your order is shipped.</li>
            <li>Shipping is free on orders above Rs. 999.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Returns & Exchanges</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Since all our products are handcrafted, each piece is unique. We do not accept returns for change of mind.</li>
            <li>If you receive a damaged or defective item, please contact us within 48 hours of delivery with photos.</li>
            <li>We will arrange a replacement or full refund for damaged items.</li>
            <li>Custom orders are non-refundable and non-returnable.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Refunds</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Approved refunds are processed within 5–7 business days.</li>
            <li>Refunds are credited to the original payment method (Razorpay / bank account).</li>
            <li>For COD orders, refunds are processed via bank transfer.</li>
          </ul>
        </section>

        <p>
          For any shipping or return queries, reach out to us at{" "}
          <a href="mailto:business.earthlytrinkets@gmail.com" className="text-primary hover:underline">
            business.earthlytrinkets@gmail.com
          </a>
        </p>
      </div>
    </main>
    <Footer />
  </div>
);

export default ShippingReturns;
