import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-16 lg:px-8">
      <div className="max-w-3xl">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Our Story
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
          About Earthly Trinkets
        </h1>
        <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground">
          Earthly Trinkets is a resin art studio inspired by botanicals, quiet textures, and
          keepsakes that feel personal. Every piece is handcrafted with care to preserve little
          details from nature and turn them into jewellery, decor, and meaningful gifts.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">What We Make</h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
            Our collections include resin jewellery, paperweights, home decor, and custom
            preservation pieces designed to hold stories, flowers, and fleeting moments.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">How We Work</h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
            We focus on small-batch craftsmanship, thoughtful finishing, and designs that balance
            minimalism with natural texture. Because each item is handmade, every piece has its own
            character.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">Why It Matters</h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
            We believe everyday objects can feel special. Whether you are buying for yourself or
            gifting someone else, we want each piece to feel grounded, personal, and lasting.
          </p>
        </section>
      </div>

      <section className="mt-10 max-w-3xl rounded-2xl border border-border bg-secondary/40 p-8">
        <h2 className="font-display text-xl font-semibold text-foreground">Looking for something personal?</h2>
        <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
          We also create custom resin pieces for gifts, preserved florals, and one-of-a-kind ideas.
          If you have a concept in mind, we would love to hear about it.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/custom-orders"
            className="rounded-full bg-primary px-5 py-2.5 font-body text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            Start a Custom Order
          </Link>
          <Link
            to="/contact"
            className="rounded-full border border-border px-5 py-2.5 font-body text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default About;
