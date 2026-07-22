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
  title: "Shade Finder — Virtual Lipstick Try-On",
  description: "Try lipstick shades live on your face with AI. No app required.",
  keywords: ["lipstick try-on", "virtual makeup", "AR lipstick", "shade finder", "beauty app"],
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
