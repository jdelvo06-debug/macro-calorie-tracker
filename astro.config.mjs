// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
