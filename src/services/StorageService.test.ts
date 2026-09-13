import { StorageService } from './StorageService';

// Mock localStorage
const localStorageMock = (function() {
  let store: any= {};
  return {
    getItem: function(key: string) {
      return store[key] || null;
    },
    setItem: function(key: string, value: string) {
      store[key] = value.toString();
    },
    clear: function() {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('StorageService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should save and retrieve widget visibility', async () => {
    await StorageService.saveWidgetVisibility(true);
    expect(await StorageService.getWidgetVisibility()).toBe(true);

    await StorageService.saveWidgetVisibility(false);
    expect(await StorageService.getWidgetVisibility()).toBe(false);
  });
});
