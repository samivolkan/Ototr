import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'looker.e2e.spec.mjs',
  timeout: 30_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:43821',
    headless: true,
    viewport: {width: 1440, height: 1000},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node local-server.mjs',
    url: 'http://127.0.0.1:43821/__test__/health',
    reuseExistingServer: true,
    timeout: 30_000
  }
});
