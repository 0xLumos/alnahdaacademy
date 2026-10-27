import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { fileURLToPath } from "node:url";

// "demo" mode swaps the Supabase backend for an in-memory one and builds one self-contained
// HTML file (dist-demo/index.html) that opens by double-click, no server needed.
export default defineConfig(({ mode }) => {
  const demo = mode === "demo";
  return {
    plugins: demo ? [react(), viteSingleFile()] : [react()],
    // BASE_PATH is set by the GitHub Pages workflow (e.g. "/repo/"); defaults to the domain root.
    base: demo ? "./" : (process.env.BASE_PATH || "/"),
    build: demo ? { outDir: "dist-demo" } : {},
    resolve: {
      alias: {
        "@api": fileURLToPath(new URL(demo ? "./src/lib/api-demo.js" : "./src/lib/api-supabase.js", import.meta.url)),
      },
    },
  };
});
