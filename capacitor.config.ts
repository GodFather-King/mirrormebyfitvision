import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fitvision.mirrorme',
  appName: 'MirrorMe',
  webDir: 'dist',
  server: {
    url: 'https://779c0489-1088-4337-9437-f4f19c37e449.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
