describe('apiClient interceptor contract', () => {
  let axiosCreateMock;
  let requestFulfilled;
  let responseRejected;
  let apiClientModule;

  const loadModule = () => {
    jest.resetModules();
    requestFulfilled = undefined;
    responseRejected = undefined;

    axiosCreateMock = jest.fn(() => ({
      interceptors: {
        request: {
          use: jest.fn((fulfilled) => {
            requestFulfilled = fulfilled;
          })
        },
        response: {
          use: jest.fn((fulfilled, rejected) => {
            responseRejected = rejected;
          })
        }
      }
    }));

    jest.doMock('axios', () => ({
      __esModule: true,
      default: {
        create: axiosCreateMock
      },
      create: axiosCreateMock
    }));

    apiClientModule = require('../apiClient');
  };

  beforeEach(() => {
    jest.useFakeTimers();
    loadModule();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('registers interceptors and skips csrf wiring for auth endpoints', async () => {
    expect(axiosCreateMock).toHaveBeenCalledWith({
      baseURL: process.env.REACT_APP_API_BASE_URL,
      withCredentials: true
    });
    expect(typeof requestFulfilled).toBe('function');
    expect(typeof responseRejected).toBe('function');

    const config = {
      method: 'post',
      url: '/api/auth/google/verify',
      headers: {}
    };

    await expect(requestFulfilled(config)).resolves.toBe(config);
    expect(config.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('wires 401 handling through the injected logout, toast, dialog, and navigation hooks', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    const showToastFn = jest.fn();
    const openDialogFn = jest.fn();
    const navigateFn = jest.fn();
    const translateFn = jest.fn((key, fallback) => fallback || key);

    apiClientModule.setupApiClientInterceptors({
      logout,
      showToastFn,
      openDialogFn,
      navigateFn,
      translateFn
    });

    const error = {
      response: {
        status: 401,
        data: {
          message: 'Unauthenticated'
        }
      },
      config: {
        url: '/api/subscription/current'
      }
    };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(showToastFn).toHaveBeenCalledWith('Your session has expired. Please log in again.', 'warning');
    expect(openDialogFn).toHaveBeenCalledWith('auth', expect.objectContaining({
      returnPath: '/',
      message: 'Please log in to continue'
    }));
    expect(navigateFn).toHaveBeenCalledWith('/', { replace: true });
  });

  it('suppresses duplicate 429 toast handling until the cooldown resets', async () => {
    const showToastFn = jest.fn();

    apiClientModule.setupApiClientInterceptors({
      logout: jest.fn(),
      showToastFn,
      openDialogFn: jest.fn(),
      navigateFn: jest.fn(),
      translateFn: jest.fn((key, fallback) => fallback || key)
    });

    const rateLimitError = {
      response: {
        status: 429,
        data: {
          message: 'Too many requests'
        }
      },
      config: {
        url: '/api/payment/create-order'
      }
    };

    await expect(responseRejected(rateLimitError)).rejects.toBe(rateLimitError);
    await expect(responseRejected(rateLimitError)).rejects.toBe(rateLimitError);

    expect(showToastFn).toHaveBeenCalledTimes(1);
    expect(showToastFn).toHaveBeenCalledWith('Too many requests. Please wait a moment and try again.', 'warning');

    jest.advanceTimersByTime(2000);

    await expect(responseRejected(rateLimitError)).rejects.toBe(rateLimitError);
    expect(showToastFn).toHaveBeenCalledTimes(2);
  });
});
