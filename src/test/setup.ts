import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver for jsdom tests (used by react-use-measure)
import ResizeObserver from 'resize-observer-polyfill';

// Polyfill localStorage for test environments where jsdom provides an
// incomplete Storage stub (missing clear/key/length).
const _localStorageData: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: (key: string) => _localStorageData[key] ?? null,
  setItem: (key: string, value: string) => {
    _localStorageData[key] = value;
  },
  removeItem: (key: string) => {
    delete _localStorageData[key];
  },
  clear: () => {
    Object.keys(_localStorageData).forEach((k) => delete _localStorageData[k]);
  },
  key: (index: number) => Object.keys(_localStorageData)[index] ?? null,
  get length() {
    return Object.keys(_localStorageData).length;
  },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

/* eslint-disable @typescript-eslint/no-explicit-any */
// ResizeObserver assignment to global
(global as any).ResizeObserver = ResizeObserver;

// Optional: polyfill matchMedia if needed by components
if (!(global as any).matchMedia) {
  (global as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
