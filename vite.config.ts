import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  css: {
    postcss: {
      plugins: [tailwind()],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: true
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  }
});
