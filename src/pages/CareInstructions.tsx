import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CareInstructions = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-16 lg:px-8">
      <h1 className="font-display text-3xl font-bold text-foreground">Care Instructions</h1>
      <div className="mt-8 max-w-2xl space-y-8 font-body text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Resin Jewellery</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Avoid direct sunlight for prolonged periods — UV can cause yellowing over time.</li>
            <li>Remove jewellery before bathing, swimming, or exercising.</li>
            <li>Keep away from perfumes, lotions, and harsh chemicals.</li>
            <li>Store in a cool, dry place — preferably in the pouch provided.</li>
            <li>Clean gently with a soft, damp cloth. Do not use abrasive cleaners.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Paperweights & Home Decor</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Wipe with a soft cloth to remove dust.</li>
            <li>Avoid placing in direct sunlight or near heat sources.</li>
            <li>Do not drop — resin can chip or crack on impact.</li>
            <li>Keep away from sharp objects that may scratch the surface.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">General Tips</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Each piece is handmade and may have slight natural variations — that's what makes it unique!</li>
            <li>Resin is durable but not indestructible. Handle with care and your piece will last for years.</li>
          </ul>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export default CareInstructions;
