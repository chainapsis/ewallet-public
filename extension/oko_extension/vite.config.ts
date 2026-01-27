import { defineConfig, build as viteBuild } from "vite";
import { resolve } from "path";
import {
  copyFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "fs";

// Plugin to build content scripts as self-contained IIFE bundles
function buildContentScriptsPlugin() {
  return {
    name: "build-content-scripts-plugin",
    async closeBundle() {
      // Build content.ts as IIFE (content scripts don't support ES modules)
      await viteBuild({
        configFile: false,
        build: {
          outDir: "dist",
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, "src/content/index.ts"),
            name: "OkoContent",
            formats: ["iife"],
            fileName: () => "content.js",
          },
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
            },
          },
          minify: false,
          sourcemap: true,
        },
        resolve: {
          alias: {
            "@": resolve(__dirname, "src"),
          },
        },
      });

      // Build injected.ts as IIFE (runs in page context)
      await viteBuild({
        configFile: false,
        build: {
          outDir: "dist",
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, "src/content/injected.ts"),
            name: "OkoInjected",
            formats: ["iife"],
            fileName: () => "injected.js",
          },
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
            },
          },
          minify: false,
          sourcemap: true,
        },
        resolve: {
          alias: {
            "@": resolve(__dirname, "src"),
          },
        },
      });
    },
  };
}

// Plugin to copy static files and fix output structure
function postBuildPlugin() {
  return {
    name: "post-build-plugin",
    closeBundle() {
      const distDir = resolve(__dirname, "dist");
      const iconsDir = resolve(distDir, "icons");

      // Ensure icons directory exists
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true });
      }

      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, "manifest.json"),
        resolve(distDir, "manifest.json")
      );

      // Copy icons
      const srcIconsDir = resolve(__dirname, "public/icons");
      if (existsSync(srcIconsDir)) {
        for (const file of readdirSync(srcIconsDir)) {
          copyFileSync(resolve(srcIconsDir, file), resolve(iconsDir, file));
        }
      }

      // Move popup HTML from src/popup/index.html to popup.html
      // Also fix the script and modulepreload paths
      const popupHtmlSrc = resolve(distDir, "src/popup/index.html");
      const popupHtmlDest = resolve(distDir, "popup.html");
      if (existsSync(popupHtmlSrc)) {
        let html = readFileSync(popupHtmlSrc, "utf-8");
        // Fix the script path from ../../popup/popup.js to ./popup/popup.js
        html = html.replace(
          /src="[^"]*popup\/popup\.js"/,
          'src="./popup/popup.js"'
        );
        // Fix modulepreload paths from ../../chunks/ to ./chunks/
        html = html.replace(
          /href="[^"]*chunks\//g,
          'href="./chunks/'
        );
        writeFileSync(popupHtmlDest, html);
      }

      // Move sign HTML from src/sign/index.html to sign.html
      const signHtmlSrc = resolve(distDir, "src/sign/index.html");
      const signHtmlDest = resolve(distDir, "sign.html");
      if (existsSync(signHtmlSrc)) {
        let html = readFileSync(signHtmlSrc, "utf-8");
        // Fix the script path
        html = html.replace(
          /src="[^"]*sign\/sign\.js"/,
          'src="./sign/sign.js"'
        );
        // Fix modulepreload paths
        html = html.replace(
          /href="[^"]*chunks\//g,
          'href="./chunks/'
        );
        writeFileSync(signHtmlDest, html);
      }

      // Clean up src directory
      if (existsSync(resolve(distDir, "src"))) {
        rmSync(resolve(distDir, "src"), { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/index.ts"),
        popup: resolve(__dirname, "src/popup/index.html"),
        sign: resolve(__dirname, "src/sign/index.html"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "popup") {
            return "popup/[name].js";
          }
          if (chunkInfo.name === "sign") {
            return "sign/[name].js";
          }
          return "[name].js";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    target: "esnext",
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [buildContentScriptsPlugin(), postBuildPlugin()],
});
