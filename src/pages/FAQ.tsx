import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const faqs = [
  {
    q: "What are your products made of?",
    a: "All our products are handcrafted using high-quality epoxy resin, combined with natural elements like dried flowers, leaves, glitter, and pigments.",
  },
  {
    q: "Do you take custom orders?",
    a: "Yes! We love creating custom pieces. Visit our Custom Orders page to describe what you have in mind and we'll get back to you with a quote.",
  },
  {
    q: "How long does shipping take?",
    a: "Orders are processed in 1–3 business days. Standard delivery across India takes 5–7 business days. You'll receive a tracking link once shipped.",
  },
  {
    q: "Can I return or exchange a product?",
    a: "Since each piece is handmade and unique, we don't accept returns for change of mind. However, if you receive a damaged item, contact us within 48 hours and we'll arrange a replacement or refund.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept UPI, credit/debit cards, net banking via Razorpay, and Cash on Delivery (COD).",
  },
  {
    q: "Is Cash on Delivery available?",
    a: "Yes, COD is available for all orders across India.",
  },
  {
    q: "How do I track my order?",
    a: "Once your order is shipped, you'll receive a tracking link via email. You can also check your order status from your Profile page.",
  },
  {
    q: "Will the product look exactly like the photo?",
    a: "Since every piece is handmade, there may be slight variations in colour, pattern, or placement of elements. That's what makes each piece one-of-a-kind!",
  },
  {
    q: "How do I care for my resin products?",
    a: "Keep away from direct sunlight, water, and chemicals. Store jewellery in the provided pouch. Check our Care Instructions page for detailed tips.",
  },
  {
    q: "Do you ship internationally?",
    a: "Currently we ship only within India. International shipping is coming soon!",
  },
];

const FAQ = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-16 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Frequently Asked Questions</h1>
        <div className="mt-8 max-w-2xl space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-border bg-card">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-body text-sm font-medium text-foreground">{faq.q}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-muted-foreground transition-transform ${openIdx === i ? "rotate-180" : ""}`}
                />
              </button>
              {openIdx === i && (
                <div className="px-5 pb-4">
                  <p className="font-body text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
