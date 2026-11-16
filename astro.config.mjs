// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://getblanc.pages.dev',
  vite: {
    plugins: [tailwindcss()],
  },
});
