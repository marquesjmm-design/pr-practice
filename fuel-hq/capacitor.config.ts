import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "pt.headoffice.postos",
  appName: "HQ Postos",
  webDir: "dist",
  android: {
    // Sem conteúdo misto: a app só carrega recursos locais ou HTTPS.
    allowMixedContent: false,
  },
};

export default config;
