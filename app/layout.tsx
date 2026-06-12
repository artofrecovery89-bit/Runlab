import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";

import Footer from "../src/components/Footer";
import CookieConsent from "../src/components/CookieConsent";

const inter = Inter({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="th">
        <body className={inter.className}>
          {children}

          <CookieConsent />
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}