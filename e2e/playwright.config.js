import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'cd ../frontend && npm run dev',
    port: 3000,
    timeout: 30000,
    reuseExistingServer: true,
  },
});
