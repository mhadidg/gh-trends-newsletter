import { vi, beforeEach } from 'vitest';

// Run before each test as vi.resetAllMocks() clears it
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error in tests
});
