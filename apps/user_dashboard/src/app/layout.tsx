import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Roboto_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "@oko-wallet/oko-common-ui/styles/colors.scss";
import "@oko-wallet/oko-common-ui/styles/typography.scss";
import "@oko-wallet/oko-common-ui/styles/shadow.scss";
import "@oko-wallet/oko-common-ui/styles/animation.scss";

import { Providers } from "@oko-wallet-user-dashboard/components/providers/providers";
import { ServiceShutdownModal } from "@oko-wallet-user-dashboard/components/service_shutdown_modal/service_shutdown_modal";

import "./globals.scss";

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

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oko Home",
  description: "Oko Home",
  icons: {
    icon: "/oko_favicon.png",
  },
  openGraph: {
    type: "website",
    url: "https://home.oko.app",
    title: "Oko Home",
    description: "Oko Home",
    siteName: "Oko Home",
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
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${robotoMono.variable}`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <ServiceShutdownModal />
        </Providers>
      </body>
    </html>
  );
}
