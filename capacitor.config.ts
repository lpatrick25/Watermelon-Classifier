import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.watermelon.classifier',
  appName: 'MeloScan',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  },
  plugins: {
    Camera: {
      permissions: {
        camera: true,
      },
    },
  },
};

export default config;
