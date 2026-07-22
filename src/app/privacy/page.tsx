import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Shade Finder",
  description:
    "How Shade Finder handles your camera access and personal data. Short version: we don't collect any.",
};

export default function PrivacyPage() {
  return (
    <main className="policy-page">
      <div className="policy-container">
        <Link href="/" className="policy-back-link">← Back to Shade Finder</Link>

        <h1 className="policy-title">Privacy Policy</h1>
        <p className="policy-updated">Last updated: July 2025</p>

        <p className="policy-intro">
          Shade Finder is designed to be the most privacy-respecting beauty
          try-on tool available. This page explains exactly what happens to your
          data — and why the answer is essentially <strong>nothing</strong>.
        </p>

        <section className="policy-section">
          <h2>Camera Access</h2>
          <p>
            When you click <em>"Try It Free"</em>, your browser asks for
            permission to access your camera. We ask for this permission
            <strong> only</strong> to draw the live video feed on the on-screen
            canvas so you can see the lipstick overlay.
          </p>
          <p>
            <strong>Your camera feed never leaves your device.</strong> It is
            not uploaded to any server, not stored anywhere, and not recorded.
            The video pixels are processed exclusively inside your browser tab
            using WebAssembly.
          </p>
        </section>

        <section className="policy-section">
          <h2>How the Face Tracking Works</h2>
          <p>
            Shade Finder uses{" "}
            <a
              href="https://developers.google.com/mediapipe"
              target="_blank"
              rel="noopener noreferrer"
              className="policy-link"
            >
              Google MediaPipe
            </a>{" "}
            — specifically the Face Landmarker model — to detect 468 facial
            landmarks in each video frame. This model is compiled to{" "}
            <strong>WebAssembly (WASM)</strong> and runs entirely in your
            browser.
          </p>
          <p>
            The model file (~6 MB) is downloaded once from Google&apos;s CDN
            when you first use the try-on tool. After that, it can run offline.
            The model itself does not send data anywhere — it is purely a local
            computation.
          </p>
          <ul className="policy-list">
            <li>No face images are stored</li>
            <li>No biometric data is extracted or retained</li>
            <li>No face embeddings or templates are created</li>
            <li>Processing stops the moment you close or navigate away from the tab</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>What Data We Collect</h2>
          <p>
            <strong>We collect no personal data.</strong> Shade Finder has no
            user accounts, no sign-up flow, and no analytics that identify you
            as an individual.
          </p>
          <p>
            The only data stored on your device is your most-recently selected
            shade, saved in <code>localStorage</code> so the app remembers your
            last pick across page reloads. This data never leaves your browser.
          </p>
        </section>

        <section className="policy-section">
          <h2>Third-Party Services</h2>
          <ul className="policy-list">
            <li>
              <strong>Vercel</strong> (hosting): Vercel processes standard HTTP
              request logs (IP address, browser type, page accessed). See{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="policy-link"
              >
                Vercel&apos;s Privacy Policy
              </a>.
            </li>
            <li>
              <strong>Google MediaPipe CDN</strong>: The WASM model file is
              fetched from{" "}
              <code>storage.googleapis.com/mediapipe-models/...</code> on first
              load. This is a standard CDN fetch — no personal data is sent.
            </li>
            <li>
              <strong>Google Fonts</strong>: Page fonts (Inter, Playfair
              Display) are loaded from Google Fonts CDN on first visit.
            </li>
          </ul>
          <p>
            We use no advertising networks, no behavioral tracking pixels, and
            no third-party analytics.
          </p>
        </section>

        <section className="policy-section">
          <h2>Brand References</h2>
          <p>
            Shade Finder references brand and product names (e.g., &quot;MAC Ruby
            Woo&quot;, &quot;Charlotte Tilbury Red Hot Red&quot;) as descriptive shade
            inspiration only. Shade Finder is <strong>not affiliated with,
            endorsed by, or partnered with any cosmetics brand</strong>. All
            brand names and trademarks are property of their respective owners.
          </p>
          <p>
            When you click &quot;Find this shade&quot;, you are directed to the
            brand&apos;s own website or a Google search. Shade Finder does not
            earn any commission or referral fee from these links.
          </p>
        </section>

        <section className="policy-section">
          <h2>Children&apos;s Privacy</h2>
          <p>
            Shade Finder is not directed at children under 13. We do not
            knowingly collect any information from children.
          </p>
        </section>

        <section className="policy-section">
          <h2>Changes to This Policy</h2>
          <p>
            If we make material changes, we will update the date at the top of
            this page. Because we collect no personal data, changes are unlikely
            to affect you in a meaningful way.
          </p>
        </section>

        <section className="policy-section">
          <h2>Contact</h2>
          <p>
            Questions about privacy? Email us at{" "}
            <a href="mailto:hello@shadefinder.app" className="policy-link">
              hello@shadefinder.app
            </a>
            .
          </p>
        </section>

        <div className="policy-footer-nav">
          <Link href="/" className="policy-back-link">← Home</Link>
          <Link href="/about" className="policy-back-link">About Shade Finder</Link>
          <Link href="/try-on" className="cta-primary" style={{ fontSize: "0.9rem", padding: "0.6rem 1.2rem" }}>
            Try It Free
          </Link>
        </div>
      </div>
    </main>
  );
}
