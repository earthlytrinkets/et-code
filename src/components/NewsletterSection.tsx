import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <section className="bg-primary py-20">
      <div className="container mx-auto px-4 text-center lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
            Stay Connected
          </h2>
          <p className="mx-auto mt-3 max-w-md font-body text-sm text-primary-foreground/80">
            Be the first to know about new collections, exclusive offers, and behind-the-scenes stories.
          </p>

          {submitted ? (
            <p className="mt-8 font-body text-sm font-medium text-primary-foreground">
              ✨ Thank you for subscribing!
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md gap-2">
              <input
                type="email"
                required
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-full border-0 bg-primary-foreground/15 px-6 py-3 font-body text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none backdrop-blur-sm focus:ring-2 focus:ring-primary-foreground/30"
              />
              <button
                type="submit"
                className="rounded-full bg-primary-foreground px-6 py-3 font-body text-sm font-semibold text-primary transition-transform hover:scale-105"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSection;
