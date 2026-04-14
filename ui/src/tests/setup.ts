/**
 * Vitest setup file
 * 
 * Global test configuration and setup for all tests
 */

import { vi } from 'vitest';

// Mock WebSocket globally
global.WebSocket = vi.fn() as any;
