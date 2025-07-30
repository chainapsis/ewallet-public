import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.scss";
// import "@keplr-ewallet/ewallet-common-ui/styles/colors.scss";
// import "@keplr-ewallet/ewallet-common-ui/styles/typography.scss";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Host website",
  description: "Host website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
