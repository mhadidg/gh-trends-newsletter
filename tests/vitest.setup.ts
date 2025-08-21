import { vi, beforeEach } from 'vitest';

// Must before each test; otherwise, vi.resetAllMocks() would clear it
beforeEach(() => {
  // Suppress logs in tests
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
