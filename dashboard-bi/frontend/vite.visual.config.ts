import { defineConfig, mergeConfig } from 'vite';
import config from './vite.config';

export default mergeConfig(
  config,
  defineConfig({
    server: {
      port: 5175,
      proxy: {
        '/api': {
          target: 'http://localhost:4002',
          changeOrigin: true
        }
      }
    },
    preview: {
      port: 5175
    }
  })
);
