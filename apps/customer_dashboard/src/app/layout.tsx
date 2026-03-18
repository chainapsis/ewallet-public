import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import "./globals.scss";
import "@oko-wallet/oko-common-ui/styles/colors.scss";
import "@oko-wallet/oko-common-ui/styles/typography.scss";
import "@oko-wallet/oko-common-ui/styles/shadow.scss";
import "@oko-wallet/oko-common-ui/styles/animation.scss";

import { Providers } from "@oko-wallet-ct-dashboard/components/providers/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oko dApp Dashboard",
  description: "Oko dApp Dashboard",
  icons: {
    icon: "/oko_favicon.png",
  },
  openGraph: {
    type: "website",
    url: "https://dashboard.oko.app",
    title: "Oko dApp Dashboard",
    description: "Oko dApp Dashboard",
    siteName: "Oko dApp Dashboard",
    images: [
      {
        url: "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/oko-dapp-og-image.png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable}`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
