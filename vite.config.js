import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the same build work at https://<user>.github.io/<repo>/
export default defineConfig({
  base: './',
  plugins: [react()],
  // All topic content is bundled on purpose (no server), so the main chunk is large.
  build: { chunkSizeWarningLimit: 1500 },
});
