import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.roomly.app",
  appName: "Roomly",
  webDir: "dist",
  // bundledAssets isn't a thing; keep default local server
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
