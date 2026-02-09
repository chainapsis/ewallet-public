import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import type { PluginOptions } from "@signalwire/docusaurus-plugin-llms-txt/public";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Oko Docs",
  tagline: "Integrate Oko into your dApp",
  favicon: "img/oko-favicon.png",

  future: {
    v4: true,
  },
  url: "https://docs.oko.app",
  baseUrl: "/",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    metadata: [
      {
        name: "og:type",
        content: "website",
      },
      {
        name: "og:image",
        content:
          "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/oko-docs-og-image.png",
      },
      { name: "algolia-site-verification", content: "3DDD6577E7B1AAA8" },
    ],
    navbar: {
      logo: {
        alt: "Oko Logo",
        src: "img/oko-logo-light.png",
        srcDark: "img/oko-logo-dark.png",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Docs",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Oko",
          items: [
            {
              label: "Github",
              href: "https://github.com/chainapsis/oko",
            },
          ],
        },
        {
          title: "Keplr",
          items: [
            {
              label: "Keplr",
              href: "https://www.keplr.app",
            },
          ],
        },
        {
          title: "Need Help?",
          items: [
            {
              label: "Oko integration support",
              href: "https://okowallet.userjot.com/board/integration-support-inquiries",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Keplr`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash"],
    },
    algolia: {
      appId: "XFC1T7WVOO",
      // Public API key: it is safe to commit it
      apiKey: "84cedabc63e83c9aaea60a9066222a2e",
      indexName: "Oko Docs",
    },
  } satisfies Preset.ThemeConfig,
  themes: ["@signalwire/docusaurus-theme-llms-txt"],
  plugins: [
    [
      "@signalwire/docusaurus-plugin-llms-txt",
      {
        llmsTxt: {
          enableLlmsFullTxt: true,
        },
        ui: {
          copyPageContent: {
            contentStrategy: "prefer-markdown",
            display: {
              docs: true,
            },
          },
        },
      } satisfies PluginOptions,
    ],
  ],
};

export default config;
