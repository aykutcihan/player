import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tvtakip.radyo',
  appName: 'Radyo',
  webDir: 'dist',
  server: {
    url: 'https://aykutcihan.github.io/tv-takip/radyo-app/',
    cleartext: true,
    allowNavigation: ['*'],
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
