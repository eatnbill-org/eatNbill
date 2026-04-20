// vite.config.ts
import { defineConfig } from "file:///C:/Users/HP/OneDrive/Documents/eatNbill/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/HP/OneDrive/Documents/eatNbill/frontend/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { VitePWA } from "file:///C:/Users/HP/OneDrive/Documents/eatNbill/frontend/node_modules/vite-plugin-pwa/dist/index.js";
import { visualizer } from "file:///C:/Users/HP/OneDrive/Documents/eatNbill/frontend/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "C:\\Users\\HP\\OneDrive\\Documents\\eatNbill\\frontend";
var vendorChunkRules = [
  { name: "vendor-animations", test: (id) => /framer-motion/.test(id) },
  { name: "vendor-charts", test: (id) => /recharts|d3-/.test(id) },
  { name: "vendor-supabase", test: (id) => /@supabase/.test(id) },
  { name: "vendor-pdf", test: (id) => /jspdf|html2canvas|dompurify|papaparse/.test(id) },
  { name: "vendor-date", test: (id) => /date-fns/.test(id) }
];
var manualChunks = (id) => {
  if (!id.includes("node_modules")) return void 0;
  for (const rule of vendorChunkRules) {
    if (rule.test(id)) return rule.name;
  }
  return "vendor-misc";
};
var vite_config_default = defineConfig(({ mode }) => {
  const isAnalyze = mode === "analyze" || process.env.ANALYZE === "true";
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false
      }
    },
    plugins: [
      react(),
      isAnalyze && visualizer({
        filename: "dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true
      }),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.png", "robots.txt"],
        workbox: {
          globIgnores: ["stats.html"]
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
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
          ]
        }
      })
    ].filter(Boolean),
    build: {
      sourcemap: false,
      cssCodeSplit: true,
      modulePreload: {
        polyfill: true
      },
      rollupOptions: {
        output: {
          manualChunks
        },
        treeshake: true
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxIUFxcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcZWF0TmJpbGxcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEhQXFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxlYXROYmlsbFxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvSFAvT25lRHJpdmUvRG9jdW1lbnRzL2VhdE5iaWxsL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcclxuaW1wb3J0IHsgdmlzdWFsaXplciB9IGZyb20gXCJyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXJcIjtcclxuXHJcbmNvbnN0IHZlbmRvckNodW5rUnVsZXM6IEFycmF5PHsgbmFtZTogc3RyaW5nOyB0ZXN0OiAoaWQ6IHN0cmluZykgPT4gYm9vbGVhbiB9PiA9IFtcclxuICB7IG5hbWU6IFwidmVuZG9yLWFuaW1hdGlvbnNcIiwgdGVzdDogKGlkKSA9PiAvZnJhbWVyLW1vdGlvbi8udGVzdChpZCkgfSxcclxuICB7IG5hbWU6IFwidmVuZG9yLWNoYXJ0c1wiLCB0ZXN0OiAoaWQpID0+IC9yZWNoYXJ0c3xkMy0vLnRlc3QoaWQpIH0sXHJcbiAgeyBuYW1lOiBcInZlbmRvci1zdXBhYmFzZVwiLCB0ZXN0OiAoaWQpID0+IC9Ac3VwYWJhc2UvLnRlc3QoaWQpIH0sXHJcbiAgeyBuYW1lOiBcInZlbmRvci1wZGZcIiwgdGVzdDogKGlkKSA9PiAvanNwZGZ8aHRtbDJjYW52YXN8ZG9tcHVyaWZ5fHBhcGFwYXJzZS8udGVzdChpZCkgfSxcclxuICB7IG5hbWU6IFwidmVuZG9yLWRhdGVcIiwgdGVzdDogKGlkKSA9PiAvZGF0ZS1mbnMvLnRlc3QoaWQpIH0sXHJcbl07XHJcblxyXG5jb25zdCBtYW51YWxDaHVua3MgPSAoaWQ6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCA9PiB7XHJcbiAgaWYgKCFpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlc1wiKSkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcbiAgZm9yIChjb25zdCBydWxlIG9mIHZlbmRvckNodW5rUnVsZXMpIHtcclxuICAgIGlmIChydWxlLnRlc3QoaWQpKSByZXR1cm4gcnVsZS5uYW1lO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIFwidmVuZG9yLW1pc2NcIjtcclxufTtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICBjb25zdCBpc0FuYWx5emUgPSBtb2RlID09PSBcImFuYWx5emVcIiB8fCBwcm9jZXNzLmVudi5BTkFMWVpFID09PSBcInRydWVcIjtcclxuXHJcbiAgcmV0dXJuIHtcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6IFwiOjpcIixcclxuICAgIHBvcnQ6IDgwODAsXHJcbiAgICBobXI6IHtcclxuICAgICAgb3ZlcmxheTogZmFsc2UsXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIGlzQW5hbHl6ZSAmJlxyXG4gICAgICB2aXN1YWxpemVyKHtcclxuICAgICAgICBmaWxlbmFtZTogXCJkaXN0L3N0YXRzLmh0bWxcIixcclxuICAgICAgICBvcGVuOiBmYWxzZSxcclxuICAgICAgICBnemlwU2l6ZTogdHJ1ZSxcclxuICAgICAgICBicm90bGlTaXplOiB0cnVlLFxyXG4gICAgICB9KSxcclxuICAgIFZpdGVQV0Eoe1xyXG4gICAgICByZWdpc3RlclR5cGU6IFwiYXV0b1VwZGF0ZVwiLFxyXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbXCJmYXZpY29uLnBuZ1wiLCBcInJvYm90cy50eHRcIl0sXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBnbG9iSWdub3JlczogW1wic3RhdHMuaHRtbFwiXSxcclxuICAgICAgfSxcclxuICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICBuYW1lOiBcIkVhdCBOIEJpbGxcIixcclxuICAgICAgICBzaG9ydF9uYW1lOiBcIkVhdCBOIEJpbGxcIixcclxuICAgICAgICBkZXNjcmlwdGlvbjogXCJFYXQgTiBCaWxsIC0gQ1JNIGZvciByZXN0YXVyYW50c1wiLFxyXG4gICAgICAgIHRoZW1lX2NvbG9yOiBcIiMxYTNhMmFcIixcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiBcIiNmZmZmZmZcIixcclxuICAgICAgICBkaXNwbGF5OiBcInN0YW5kYWxvbmVcIixcclxuICAgICAgICBzdGFydF91cmw6IFwiL1wiLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7IHNyYzogXCIvaWNvbnMvaWNvbi0xOTIucG5nXCIsIHNpemVzOiBcIjE5MngxOTJcIiwgdHlwZTogXCJpbWFnZS9wbmdcIiB9LFxyXG4gICAgICAgICAgeyBzcmM6IFwiL2ljb25zL2ljb24tNTEyLnBuZ1wiLCBzaXplczogXCI1MTJ4NTEyXCIsIHR5cGU6IFwiaW1hZ2UvcG5nXCIgfSxcclxuICAgICAgICAgIHsgc3JjOiBcIi9pY29ucy9pY29uLTUxMi5wbmdcIiwgc2l6ZXM6IFwiNTEyeDUxMlwiLCB0eXBlOiBcImltYWdlL3BuZ1wiLCBwdXJwb3NlOiBcImFueSBtYXNrYWJsZVwiIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxyXG4gICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxyXG4gICAgbW9kdWxlUHJlbG9hZDoge1xyXG4gICAgICBwb2x5ZmlsbDogdHJ1ZSxcclxuICAgIH0sXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rcyxcclxuICAgICAgfSxcclxuICAgICAgdHJlZXNoYWtlOiB0cnVlLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG59O1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVixTQUFTLG9CQUFvQjtBQUM3VyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsZUFBZTtBQUN4QixTQUFTLGtCQUFrQjtBQUozQixJQUFNLG1DQUFtQztBQU16QyxJQUFNLG1CQUEyRTtBQUFBLEVBQy9FLEVBQUUsTUFBTSxxQkFBcUIsTUFBTSxDQUFDLE9BQU8sZ0JBQWdCLEtBQUssRUFBRSxFQUFFO0FBQUEsRUFDcEUsRUFBRSxNQUFNLGlCQUFpQixNQUFNLENBQUMsT0FBTyxlQUFlLEtBQUssRUFBRSxFQUFFO0FBQUEsRUFDL0QsRUFBRSxNQUFNLG1CQUFtQixNQUFNLENBQUMsT0FBTyxZQUFZLEtBQUssRUFBRSxFQUFFO0FBQUEsRUFDOUQsRUFBRSxNQUFNLGNBQWMsTUFBTSxDQUFDLE9BQU8sd0NBQXdDLEtBQUssRUFBRSxFQUFFO0FBQUEsRUFDckYsRUFBRSxNQUFNLGVBQWUsTUFBTSxDQUFDLE9BQU8sV0FBVyxLQUFLLEVBQUUsRUFBRTtBQUMzRDtBQUVBLElBQU0sZUFBZSxDQUFDLE9BQW1DO0FBQ3ZELE1BQUksQ0FBQyxHQUFHLFNBQVMsY0FBYyxFQUFHLFFBQU87QUFFekMsYUFBVyxRQUFRLGtCQUFrQjtBQUNuQyxRQUFJLEtBQUssS0FBSyxFQUFFLEVBQUcsUUFBTyxLQUFLO0FBQUEsRUFDakM7QUFFQSxTQUFPO0FBQ1Q7QUFHQSxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNLFlBQVksU0FBUyxhQUFhLFFBQVEsSUFBSSxZQUFZO0FBRWhFLFNBQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLEtBQUs7QUFBQSxRQUNILFNBQVM7QUFBQSxNQUNYO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sYUFDRSxXQUFXO0FBQUEsUUFDVCxVQUFVO0FBQUEsUUFDVixNQUFNO0FBQUEsUUFDTixVQUFVO0FBQUEsUUFDVixZQUFZO0FBQUEsTUFDZCxDQUFDO0FBQUEsTUFDSCxRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsUUFDZCxlQUFlLENBQUMsZUFBZSxZQUFZO0FBQUEsUUFDM0MsU0FBUztBQUFBLFVBQ1AsYUFBYSxDQUFDLFlBQVk7QUFBQSxRQUM1QjtBQUFBLFFBQ0EsVUFBVTtBQUFBLFVBQ1IsTUFBTTtBQUFBLFVBQ04sWUFBWTtBQUFBLFVBQ1osYUFBYTtBQUFBLFVBQ2IsYUFBYTtBQUFBLFVBQ2Isa0JBQWtCO0FBQUEsVUFDbEIsU0FBUztBQUFBLFVBQ1QsV0FBVztBQUFBLFVBQ1gsT0FBTztBQUFBLFlBQ0wsRUFBRSxLQUFLLHVCQUF1QixPQUFPLFdBQVcsTUFBTSxZQUFZO0FBQUEsWUFDbEUsRUFBRSxLQUFLLHVCQUF1QixPQUFPLFdBQVcsTUFBTSxZQUFZO0FBQUEsWUFDbEUsRUFBRSxLQUFLLHVCQUF1QixPQUFPLFdBQVcsTUFBTSxhQUFhLFNBQVMsZUFBZTtBQUFBLFVBQzdGO0FBQUEsUUFDRjtBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0gsRUFBRSxPQUFPLE9BQU87QUFBQSxJQUNoQixPQUFPO0FBQUEsTUFDTCxXQUFXO0FBQUEsTUFDWCxjQUFjO0FBQUEsTUFDZCxlQUFlO0FBQUEsUUFDYixVQUFVO0FBQUEsTUFDWjtBQUFBLE1BQ0EsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFVBQ047QUFBQSxRQUNGO0FBQUEsUUFDQSxXQUFXO0FBQUEsTUFDYjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxNQUN0QztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0EsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
