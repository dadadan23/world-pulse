export {};

declare global {
  interface Window {
    /** Bridge exposed by src/main/preload.ts via contextBridge. Undefined outside Electron. */
    electronAPI?: {
      platform: string;
      onUpdateStatus: (callback: (status: string) => void) => () => void;
    };
  }
}
