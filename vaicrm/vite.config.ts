import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
plugins: [
react(),
runtimeErrorOverlay(),
visualizer({
filename: './dist/bundle-analysis.html',
open: false,
gzipSize: true,
brotliSize: true,
}),
...(process.env.NODE_ENV !== "production" &&
process.env.REPL_ID !== undefined
? [
await import("@replit/vite-plugin-cartographer").then((m) =>
m.cartographer(),
),
]
: []),
],
resolve: {
alias: {
"@": path.resolve(import.meta.dirname, "client", "src"),
"@shared": path.resolve(import.meta.dirname, "shared"),
"@assets": path.resolve(import.meta.dirname, "attached_assets"),
},
},
root: path.resolve(import.meta.dirname, "client"),
build: {
outDir: path.resolve(import.meta.dirname, "dist"),
emptyOutDir: true,
minify: "terser", // Enable advanced JS minification
},
server: {
fs: {
strict: true,
deny: ["**/.*"],
},
// This tells Vite how to handle requests in development
proxy: {
// Any request starting with '/api' will be forwarded
'/api': {
// The target is your real Java backend
target: 'http://127.0.0.1:5001',
// This is important for virtual hosted sites
changeOrigin: true,
rewrite: (path) => path.replace(/^\/api/, ''),
// We do NOT need to rewrite the path, because your Express server
// also expects the path to start with /api.
},
},
},
});