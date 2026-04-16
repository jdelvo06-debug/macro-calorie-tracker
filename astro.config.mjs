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
  },
});