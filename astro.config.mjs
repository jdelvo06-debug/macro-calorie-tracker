// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://jdelvo06-debug.github.io',
  base: '/macro-calorie-tracker',
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY),
      'import.meta.env.USDA_FDC_API_KEY': JSON.stringify(process.env.USDA_FDC_API_KEY),
    },
  },
});