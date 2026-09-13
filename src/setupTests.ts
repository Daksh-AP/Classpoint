import '@testing-library/jest-dom';

if (typeof window !== 'undefined') {
  (window as any).DOMMatrix = window.DOMMatrix || class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
  };
}
