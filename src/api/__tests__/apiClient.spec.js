// Mock axios before importing apiClient
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      response: {
        use: jest.fn()
      }
    }
  }))
}));

import { setupApiClientInterceptors } from '../apiClient';

describe('API Client Setup', () => {
  it('should setup interceptors with dependencies', () => {
    const mockLogout = jest.fn();
    const mockShowToast = jest.fn();
    const mockOpenDialog = jest.fn();
    const mockNavigate = jest.fn();
    const mockT = jest.fn((key, defaultValue) => defaultValue || key);

    expect(() => {
      setupApiClientInterceptors({
        logout: mockLogout,
        showToastFn: mockShowToast,
        openDialogFn: mockOpenDialog,
        navigateFn: mockNavigate,
        translateFn: mockT
      });
    }).not.toThrow();
  });

  it('should handle missing dependencies gracefully', () => {
    expect(() => {
      setupApiClientInterceptors({});
    }).not.toThrow();
  });

  it('should handle null dependencies gracefully', () => {
    expect(() => {
      setupApiClientInterceptors({
        logout: null,
        showToastFn: null,
        openDialogFn: null,
        navigateFn: null,
        translateFn: null
      });
    }).not.toThrow();
  });
});