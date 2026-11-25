// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://getblanc.web.id',
  vite: {
    plugins: [tailwindcss()],
  },
});
