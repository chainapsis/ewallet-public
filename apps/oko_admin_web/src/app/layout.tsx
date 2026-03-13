import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import "./globals.scss";
import "@oko-wallet/oko-common-ui/styles/colors.scss";
import "@oko-wallet/oko-common-ui/styles/typography.scss";
import "@oko-wallet/oko-common-ui/styles/shadow.scss";

import { Auth } from "@oko-wallet-admin/components/auth";
import { GlobalHeader } from "@oko-wallet-admin/components/global_header/global_header";
import { MainFrame } from "@oko-wallet-admin/components/main_frame/main_frame";
import { TopProvider } from "@oko-wallet-admin/components/top_provider/top_provider";

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
  title: "Oko Admin",
  description: "Oko Admin",
  icons: {
    icon: "/oko_favicon.png",
  },
  openGraph: {
    type: "website",
    url: "https://admin.oko.app",
    title: "Oko Admin",
    description: "Oko Admin",
    siteName: "Oko Admin",
    images: [
      {
        url: "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/oko-og-image.png",
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
        <TopProvider>
          <Auth>
            <MainFrame>
              <GlobalHeader />
              {children}
            </MainFrame>
          </Auth>
        </TopProvider>
      </body>
    </html>
  );
}
