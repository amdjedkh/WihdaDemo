import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Resolves figma:asset/HASH.png → src/assets/HASH.png
// The Figma Make environment uses a custom "figma:asset/" URL scheme; outside
// of Figma we redirect each import to the matching file in src/assets/.
const figmaAssetPlugin = {
  name: 'figma-asset-resolver',
  resolveId(id: string) {
    if (id.startsWith('figma:asset/')) {
      const filename = id.replace('figma:asset/', '');
      return path.resolve(__dirname, 'src/assets', filename);
    }
  },
};

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    figmaAssetPlugin,
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Required for Capacitor: assets must use relative paths so they work
  // inside the native WebView (file:// origin on Android/iOS)
  base: './',

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    // Output into dist/ — this is what capacitor.config.json points to
    outDir: 'dist',
  },

  server: {
    // Proxy /v1/* to the backend in dev so CORS isn't needed during browser testing.
    // This only applies when running `vite` (not in the built app or Capacitor).
    // The built app always uses VITE_API_URL to reach the backend directly.
    proxy: {
      '/v1': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
