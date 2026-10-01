import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/ui",
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8765",
    viewport: { width: 390, height: 844 },
    launchOptions: process.env.ALIADO_CHROMIUM_PATH
      ? {
          executablePath: process.env.ALIADO_CHROMIUM_PATH,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--no-zygote",
            "--disable-gpu",
          ],
        }
      : {},
  },
  webServer: {
    command: process.env.ALIADO_TEST_PRODUCCION
      ? "npm run preview -- --host 127.0.0.1 --port 8765 --strictPort"
      : "npm run dev -- --host 127.0.0.1 --port 8765 --strictPort",
    url: "http://127.0.0.1:8765",
    reuseExistingServer: !process.env.CI,
  },
});
