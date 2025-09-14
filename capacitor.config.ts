import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.watermelon.classifier',
  appName: 'Watermelon',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  }
};

export default config;
