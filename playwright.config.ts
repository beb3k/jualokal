import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  reporter: "line",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
    launchOptions: {
      args: ["--force-prefers-reduced-motion=reduce"],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "phone",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
