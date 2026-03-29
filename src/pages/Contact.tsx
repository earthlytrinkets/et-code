import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Send, Mail, Instagram, MapPin, ChevronDown } from "lucide-react";

const faqs = [
  { q: "How long does shipping take?", a: "We ship within 3-5 business days. Delivery typically takes 5-7 days across India." },
  { q: "Are your products waterproof?", a: "Our resin pieces are water-resistant but we recommend avoiding prolonged water exposure to maintain their beauty." },
  { q: "Can I return a product?", a: "We accept returns within 7 days of delivery if the product is unused and in original packaging." },
  { q: "Do you ship internationally?", a: "Currently we ship within India only. International shipping is coming soon!" },
  { q: "How do I care for resin jewellery?", a: "Keep away from direct sunlight and harsh chemicals. Store in the provided pouch when not wearing." },
];

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-12 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Get in Touch</h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">We'd love to hear from you.</p>
        </motion.div>

        <div className="mt-12 grid gap-12 lg:grid-cols-2">
          {/* Contact Form */}
          <div>
            {submitted ? (
              <div className="rounded-xl bg-card p-12 text-center shadow-soft">
                <p className="font-display text-xl font-semibold text-foreground">✨ Message Sent!</p>
                <p className="mt-2 font-body text-sm text-muted-foreground">We'll reply within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-5">
                <div>
                  <label className="font-body text-sm font-medium text-foreground">Name</label>
                  <input required type="text" className="mt-1.5 w-full rounded-lg border border-border bg-card px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring" placeholder="Your name" />
                </div>
                <div>
                  <label className="font-body text-sm font-medium text-foreground">Email</label>
                  <input required type="email" className="mt-1.5 w-full rounded-lg border border-border bg-card px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring" placeholder="your@email.com" />
                </div>
                <div>
                  <label className="font-body text-sm font-medium text-foreground">Message</label>
                  <textarea required rows={5} className="mt-1.5 w-full rounded-lg border border-border bg-card px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Your message..." />
                </div>
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow">
                  Send Message <Send size={14} />
                </button>
              </form>
            )}

            <div className="mt-10 space-y-4">
              <a href="mailto:business.earthlytrinkets@gmail.com" className="flex items-center gap-3 font-body text-sm text-muted-foreground hover:text-foreground">
                <Mail size={16} className="text-primary" /> business.earthlytrinkets@gmail.com
              </a>
              <a href="https://www.instagram.com/earthly.trinkets/" target="_blank" rel="noreferrer" className="flex items-center gap-3 font-body text-sm text-muted-foreground hover:text-foreground">
                <Instagram size={16} className="text-primary" /> @earthly.trinkets
              </a>
              <div className="flex items-center gap-3 font-body text-sm text-muted-foreground">
                <MapPin size={16} className="text-primary" /> Handcrafted in India
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-2">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <span className="font-body text-sm font-medium text-foreground">{faq.q}</span>
                    <ChevronDown size={16} className={`text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-border px-4 py-3">
                      <p className="font-body text-sm text-muted-foreground">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
