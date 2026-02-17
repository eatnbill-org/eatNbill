import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

const vendorChunkRules: Array<{ name: string; test: (id: string) => boolean }> = [
  { name: "vendor-animations", test: (id) => /framer-motion/.test(id) },
  { name: "vendor-charts", test: (id) => /recharts|d3-/.test(id) },
  { name: "vendor-supabase", test: (id) => /@supabase/.test(id) },
  { name: "vendor-pdf", test: (id) => /jspdf|html2canvas|dompurify|papaparse/.test(id) },
  { name: "vendor-date", test: (id) => /date-fns/.test(id) },
];

const manualChunks = (id: string): string | undefined => {
  if (!id.includes("node_modules")) return undefined;

  for (const rule of vendorChunkRules) {
    if (rule.test(id)) return rule.name;
  }

  return "vendor-misc";
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isAnalyze = mode === "analyze" || process.env.ANALYZE === "true";

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    isAnalyze &&
      visualizer({
        filename: "dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "robots.txt"],
      workbox: {
        globIgnores: ["stats.html"],
      },
      manifest: {
        name: "Eat N Bill",
        short_name: "Eat N Bill",
        description: "Eat N Bill - CRM for restaurants",
        theme_color: "#1a3a2a",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks,
      },
      treeshake: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});
