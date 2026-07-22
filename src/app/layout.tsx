import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Shade Finder — Virtual Lipstick Try-On",
    template: "%s | Shade Finder",
  },
  description:
    "Try 60+ lipstick shades live on your face — entirely in your browser. AI-powered AR, no signup, no download, 100% private.",
  keywords: [
    "lipstick try-on",
    "virtual makeup",
    "AR lipstick",
    "shade finder",
    "beauty app",
    "lipstick colour match",
    "try lipstick online",
    "virtual try-on",
  ],
  metadataBase: new URL("https://lipstick-shade-finder.vercel.app"),
  openGraph: {
    title: "Shade Finder — Virtual Lipstick Try-On",
    description:
      "See how any lipstick shade looks on YOU — live, in your browser. 60+ curated shades, AI face tracking, no signup.",
    url: "https://lipstick-shade-finder.vercel.app",
    siteName: "Shade Finder",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Shade Finder — AR lipstick try-on in the browser",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shade Finder — Try Lipstick Shades Live",
    description:
      "AR lipstick try-on in your browser. 60+ shades, no app, no signup.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

const schemaOrg = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shade Finder",
  operatingSystem: "Web",
  applicationCategory: "BeautyApplication",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Browser-based AR lipstick try-on tool with 60+ curated shades. Uses MediaPipe face tracking. No download, no signup, 100% private.",
  url: "https://lipstick-shade-finder.vercel.app",
  screenshot: "https://lipstick-shade-finder.vercel.app/og-image.png",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#1A0A0F" />

        {/* schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />

        {/* Suppress MediaPipe/TFLite WASM noise routed through console.error.
            Must be an inline script so it runs before Next.js dev overlay wraps console.error. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  var _origErr = console.error.bind(console);
  var SKIP = ["INFO:","WARNING:","W0","I0","Created TensorFlow","TfLite","XNNPACK"];
  console.error = function() {
    var msg = String(arguments[0] || "");
    for(var i=0;i<SKIP.length;i++){ if(msg.indexOf(SKIP[i])===0) return; }
    _origErr.apply(console, arguments);
  };
})();
`,
          }}
        />
      </head>
      <body className="app-body">{children}</body>
    </html>
  );
}
