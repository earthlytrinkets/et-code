import { Link } from "react-router-dom";
import { Instagram, Mail, Leaf } from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="border-t border-border bg-secondary/50">
    <div className="container mx-auto px-4 py-16 lg:px-8">
      <div className="grid gap-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Earthly Trinkets" className="h-10 w-10 rounded-full object-cover" />
            <span className="font-display text-xl font-bold italic tracking-wide text-foreground">
              <span className="text-primary">Earthly</span> Trinkets
            </span>
          </Link>
          <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
            Handcrafted epoxy resin art inspired by nature, minimalism, and earthy aesthetics.
          </p>
          <div className="mt-4 flex gap-3">
            <a href="https://www.instagram.com/earthly.trinkets/" target="_blank" rel="noreferrer" className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
              <Instagram size={16} />
            </a>
            <a href="mailto:business.earthlytrinkets@gmail.com" className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
              <Mail size={16} />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Shop</h4>
          <ul className="mt-3 space-y-2">
            {[
              ["Jewellery", "/shop?category=jewellery"],
              ["Paperweights", "/shop?category=paperweights"],
              ["Home Decor", "/shop?category=home-decor"],
              ["Custom Pieces", "/shop?category=custom-pieces"],
            ].map(([label, to]) => (
              <li key={label}>
                <Link to={to} className="font-body text-sm text-muted-foreground transition-colors hover:text-primary">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Company</h4>
          <ul className="mt-3 space-y-2">
            {[
              ["About", "/about"],
              ["Custom Orders", "/custom-orders"],
              ["Contact", "/contact"],
            ].map(([label, to]) => (
              <li key={label}>
                <Link to={to} className="font-body text-sm text-muted-foreground transition-colors hover:text-primary">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Help</h4>
          <ul className="mt-3 space-y-2">
            {[
              ["Shipping & Returns", "/shipping-returns"],
              ["Care Instructions", "/care-instructions"],
              ["FAQ", "/faq"],
              ["Privacy Policy", "/privacy-policy"],
            ].map(([label, to]) => (
              <li key={label}>
                <Link to={to} className="font-body text-sm text-muted-foreground transition-colors hover:text-primary">{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div id="footer-bar" className="mt-12 flex items-center justify-between border-t border-border pt-8">
        <p className="font-body text-xs text-muted-foreground">
          © 2026 Earthly Trinkets. All rights reserved.
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Leaf size={12} className="text-primary" />
          <span className="font-body">Made with love & resin</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
