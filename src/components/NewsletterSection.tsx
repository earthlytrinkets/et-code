import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await (supabase.from("subscribers" as never) as any).insert({ email });
    if (error) {
      if (error.code === "23505") {
        toast.success("You're already subscribed!");
        setSubmitted(true);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } else {
      toast.success("Welcome aboard!");
      setSubmitted(true);
    }
    setEmail("");
    setLoading(false);
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
            Be the first to know about new collections, price drops, and exclusive offers.
          </p>

          {submitted ? (
            <p className="mt-8 font-body text-sm font-medium text-primary-foreground">
              Thank you for subscribing!
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
                disabled={loading}
                className="rounded-full bg-primary-foreground px-6 py-3 font-body text-sm font-semibold text-primary transition-transform hover:scale-105 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSection;
