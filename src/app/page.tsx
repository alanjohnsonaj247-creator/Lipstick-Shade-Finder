import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Shield, Zap, Camera, Heart, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Shade Finder — Virtual Lipstick Try-On | See It On You Before You Buy",
  description:
    "Try 60+ curated lipstick shades live on your face — entirely in your browser. AI-powered, no signup, no download.",
  openGraph: {
    title: "Shade Finder — Virtual Lipstick Try-On",
    description: "Try any lipstick shade live on your face. AI face tracking, 60+ shades, no signup.",
    type: "website",
    url: "https://lipstick-shade-finder.vercel.app",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Shade Finder AR Try-On" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shade Finder — Try Lipstick Shades Live",
    description: "AR lipstick try-on in your browser. 60+ shades, no app, no signup.",
    images: ["/og-image.png"],
  },
};

const FEATURES = [
  {
    icon: <Camera size={28} />,
    title: "Live AR Try-On",
    desc: "See any shade on your lips in real time, updated at 30fps as you move and smile.",
  },
  {
    icon: <Sparkles size={28} />,
    title: "60+ Curated Shades",
    desc: "Reds, nudes, pinks, berries, browns, purples — with matte, satin, glossy & sheer finishes.",
  },
  {
    icon: <Heart size={28} />,
    title: "Save & Compare",
    desc: "Find shades that suit your undertone. Copy the hex code or compare side-by-side.",
  },
  {
    icon: <Shield size={28} />,
    title: "100% Private",
    desc: "Face tracking runs entirely on your device. No data is ever uploaded.",
  },
  {
    icon: <Zap size={28} />,
    title: "Instant Switching",
    desc: "Tap any swatch to see a new shade appear on your lips within one frame.",
  },
];

// Brand-agnostic: show finish/family labels, not brand names
const SHADE_FAMILIES = [
  "Reds", "Pinks", "Nudes", "Mauves", "Berries",
  "Browns", "Corals", "Purples", "· Matte", "· Glossy", "· Satin", "· Sheer",
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            Powered by MediaPipe AI
          </div>
          <h1 className="hero-title">
            Try Any Lipstick Shade.
            <br />
            <span className="hero-gradient-text">Live On Your Face.</span>
          </h1>
          <p className="hero-subtitle">
            See exactly how a shade looks on <em>you</em> — not on a model —
            before you spend a dollar. 60+ curated shades across every finish,
            all in your browser. Free forever.
          </p>
          <div className="hero-cta-row">
            <Link href="/try-on" className="cta-primary" id="hero-try-now-btn">
              <Camera size={20} />
              Try It Free
              <ArrowRight size={18} />
            </Link>
            <span className="cta-note">No download · No signup · Works on mobile</span>
          </div>
        </div>

        {/* Hero visual */}
        <div className="hero-visual">
          <div className="hero-phone-mockup">
            <div className="phone-screen">
              <div className="phone-camera-placeholder">
                <div className="phone-face-outline" />
                <div className="phone-lip-glow" style={{ backgroundColor: "#C0392B" }} />
              </div>
              <div className="phone-shade-strip">
                {["#C0392B", "#E8A0BF", "#8B4513", "#7D3C98", "#F4A7B9", "#4A235A"].map(
                  (hex) => (
                    <span
                      key={hex}
                      className="phone-mini-swatch"
                      style={{ backgroundColor: hex }}
                    />
                  )
                )}
              </div>
            </div>
          </div>
          <div className="hero-glow-ring" />
        </div>
      </section>

      {/* Shade families strip — brand-agnostic */}
      <section className="brands-strip">
        <p className="brands-strip-label">60+ shades across</p>
        <div className="brands-marquee">
          {[...SHADE_FAMILIES, ...SHADE_FAMILIES].map((label, i) => (
            <span key={i} className="brand-marquee-item">
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <h2 className="section-title">Everything You Need</h2>
        <p className="section-subtitle">
          A beauty tool that feels as good as the products you&apos;re trying on.
        </p>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Shade preview */}
      <section className="shade-preview-section">
        <h2 className="section-title">60+ Shades. Every Occasion.</h2>
        <div className="shade-preview-grid">
          {[
            { name: "Classic Red", hex: "#C0392B", finish: "matte" },
            { name: "Rose Quartz", hex: "#E8A0BF", finish: "sheer" },
            { name: "Your Skin But Better", hex: "#C68642", finish: "satin" },
            { name: "Plum Perfect", hex: "#6C3483", finish: "matte" },
            { name: "Cherry Bomb", hex: "#A93226", finish: "glossy" },
            { name: "Terracotta", hex: "#C35A38", finish: "satin" },
            { name: "Fuchsia Fever", hex: "#C0175D", finish: "matte" },
            { name: "Amethyst Dreams", hex: "#7D3C98", finish: "matte" },
          ].map((shade) => (
            <Link
              href="/try-on"
              key={shade.name}
              className="shade-preview-card"
            >
              <span
                className="shade-preview-circle"
                style={{ backgroundColor: shade.hex }}
              />
              <span className="shade-preview-name">{shade.name}</span>
              <span className="shade-preview-finish">{shade.finish}</span>
            </Link>
          ))}
        </div>
        <Link href="/try-on" className="cta-primary cta-centered" id="shade-preview-try-btn">
          <Camera size={18} />
          Try It Free
        </Link>
      </section>

      {/* Privacy section */}
      <section className="privacy-section">
        <div className="privacy-card">
          <div className="privacy-icon">🔒</div>
          <h2 className="privacy-title">Your Face. Your Device. Your Privacy.</h2>
          <p className="privacy-body">
            Shade Finder uses Google&apos;s MediaPipe face-landmark model, compiled to
            WebAssembly and running <strong>entirely inside your browser tab</strong>.
            Your camera feed never leaves your device — no video, no images, and no
            biometric data are ever transmitted to any server.
          </p>
          <div className="privacy-points">
            <span>✅ No uploads</span>
            <span>✅ No storage</span>
            <span>✅ No tracking</span>
            <span>✅ Works offline after first load</span>
          </div>
          <Link href="/privacy" className="privacy-learn-more">
            Read our full Privacy Policy →
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-section">
        <h2 className="final-cta-title">Ready to Find Your Perfect Shade?</h2>
        <Link href="/try-on" className="cta-primary cta-large" id="final-cta-btn">
          <Camera size={22} />
          Try It Free
          <ArrowRight size={20} />
        </Link>
        <p className="final-cta-note">Free · Works on any device · No signup</p>
      </section>

      <footer className="landing-footer">
        <p>
          © {new Date().getFullYear()} Shade Finder · Built with MediaPipe AI · All face data processed locally
        </p>
        <div className="footer-links">
          <Link href="/privacy" className="footer-privacy-link" id="footer-privacy-btn">
            Privacy Policy
          </Link>
          <Link href="/about" id="footer-about-link">About</Link>
          <Link href="/try-on" id="footer-tryon-link">Try-On App</Link>
        </div>
        <p className="footer-legal">
          Shade Finder is an independent tool and is not affiliated with, endorsed by,
          or partnered with any cosmetics brand. Brand and product names referenced in
          shade suggestions are trademarks of their respective owners, used for
          descriptive purposes only.
        </p>
      </footer>
    </main>
  );
}
