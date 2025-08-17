import { vi, beforeEach } from 'vitest';

// Run before each test as vi.resetAllMocks() clears it
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {}); // Suppress info logs
  vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logs
});
