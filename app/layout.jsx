import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  metadataBase: new URL("https://www.o-auth-simplified.com"),
  title: {
    default: "o-auth 2.0 Simplified",
    template: "%s",
  },
  description:
    "An illustrated, plain-language guide to the OAuth 2.0 authorization framework, written by Aaron Parecki.",
  openGraph: {
    siteName: "o-auth 2.0 Simplified",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
