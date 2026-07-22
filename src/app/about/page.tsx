import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Shield, Camera } from "lucide-react";

export const metadata: Metadata = {
  title: "About — Shade Finder",
  description:
    "Shade Finder is an independent browser-based AR lipstick try-on tool. Built for real people who want to see how a shade actually looks on their own face.",
};

export default function AboutPage() {
  return (
    <main className="policy-page">
      <div className="policy-container">
        <Link href="/" className="policy-back-link">← Back to Shade Finder</Link>

        <h1 className="policy-title">About Shade Finder</h1>

        <p className="policy-intro">
          Shade Finder is an independent, browser-based augmented reality tool
          that lets you try lipstick shades live on your face — before you spend
          a cent. No app to install. No account to create. Just open the site
          and see the shade on <em>you</em>, not on a stock model.
        </p>

        <section className="policy-section">
          <h2>Why We Built This</h2>
          <p>
            The beauty industry is full of try-on apps — but most either require
            an app download, collect your face data, only show shades that
            benefit their brand partners, or produce results that look so
            artificial you can&apos;t actually judge the shade.
          </p>
          <p>
            Shade Finder was built to be different: open, honest, and accurate.
            The AR renderer uses multi-pass canvas compositing with skin-tone-aware
            blending so the result actually looks like a real lipstick on your skin
            — not a flat painted rectangle.
          </p>
        </section>

        <section className="policy-section about-pillars">
          <div className="about-pillar">
            <div className="about-pillar-icon"><Shield size={28} /></div>
            <h3>Privacy First</h3>
            <p>
              All face tracking runs inside your browser using WebAssembly.
              Nothing is uploaded. Read the full{" "}
              <Link href="/privacy" className="policy-link">Privacy Policy</Link>.
            </p>
          </div>
          <div className="about-pillar">
            <div className="about-pillar-icon"><Sparkles size={28} /></div>
            <h3>Brand Independent</h3>
            <p>
              We have no affiliate deals, no brand partnerships, and no paid
              placements. Shade references are for inspiration only.
            </p>
          </div>
          <div className="about-pillar">
            <div className="about-pillar-icon"><Camera size={28} /></div>
            <h3>Built in the Open</h3>
            <p>
              Shade Finder is built with Next.js, MediaPipe, and standard Web
              APIs. No proprietary SDKs or black-box AR engines.
            </p>
          </div>
        </section>

        <section className="policy-section">
          <h2>Tech Stack</h2>
          <ul className="policy-list">
            <li><strong>Face tracking:</strong> Google MediaPipe Face Landmarker (WASM)</li>
            <li><strong>AR rendering:</strong> Multi-pass 2D Canvas API with offscreen compositing</li>
            <li><strong>Framework:</strong> Next.js 16 (App Router, Turbopack)</li>
            <li><strong>Hosting:</strong> Vercel</li>
            <li><strong>Color science:</strong> CIE L*a*b* Delta-E for shade matching</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Contact</h2>
          <p>
            Questions, feedback, or partnership inquiries? Reach us at{" "}
            <a href="mailto:hello@shadefinder.app" className="policy-link">
              hello@shadefinder.app
            </a>
            .
          </p>
          <p className="about-disclaimer">
            Shade Finder is not affiliated with, endorsed by, or partnered with
            any cosmetics brand. All brand and product names referenced in shade
            suggestions are trademarks of their respective owners and are used
            for descriptive purposes only.
          </p>
        </section>

        <div className="policy-footer-nav">
          <Link href="/" className="policy-back-link">← Home</Link>
          <Link href="/privacy" className="policy-back-link">Privacy Policy</Link>
          <Link href="/try-on" className="cta-primary" style={{ fontSize: "0.9rem", padding: "0.6rem 1.2rem" }}>
            Try It Free
          </Link>
        </div>
      </div>
    </main>
  );
}
