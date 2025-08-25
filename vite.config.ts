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
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**',
      'supabase/**',
      '**/*.e2e.spec.ts',
      '**/*.spec.ts',
    ],
    include: [
      'src/**/*.test.{js,ts,jsx,tsx}',
      'src/**/*.{test,integration}.{js,ts,jsx,tsx}',
    ],
  }
});
