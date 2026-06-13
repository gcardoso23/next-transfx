import { defineConfig, devices } from '@playwright/test'

const PORT = 3210

// Runs against a production build, where navigations are as fast as they get
// and nothing is double rendered.
export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
  reporter: 'list',
  testDir: 'e2e',
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `bun run build && bun run start --port ${PORT}`,
    reuseExistingServer: !process.env.CI,
    url: `http://localhost:${PORT}`,
  },
})
