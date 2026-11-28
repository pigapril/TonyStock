import { initializeApiClient } from '../setupApiClient';
import { setupApiClientInterceptors } from '../apiClient';

jest.mock('../apiClient', () => ({
  setupApiClientInterceptors: jest.fn()
}));

describe('initializeApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes all required handlers to the API client interceptors', () => {
    const dependencies = {
      clearAuthState: jest.fn(),
      showToast: jest.fn(),
      openDialog: jest.fn(),
      t: jest.fn()
    };

    initializeApiClient(dependencies);

    expect(setupApiClientInterceptors).toHaveBeenCalledWith({
      clearAuthState: dependencies.clearAuthState,
      showToastFn: dependencies.showToast,
      openDialogFn: dependencies.openDialog,
      translateFn: dependencies.t
    });
    expect(console.log).toHaveBeenCalledWith('API Client interceptors initialized successfully');
  });

  it('warns for missing handlers but still initializes the interceptors', () => {
    initializeApiClient({});

    expect(console.warn).toHaveBeenCalledTimes(4);
    expect(setupApiClientInterceptors).toHaveBeenCalledWith({
      clearAuthState: undefined,
      showToastFn: undefined,
      openDialogFn: undefined,
      translateFn: undefined
    });
  });
});
