export {};

declare global {
  interface Window {
    electronAPI: any
    require: any
  }
}
