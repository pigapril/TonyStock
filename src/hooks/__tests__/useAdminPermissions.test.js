import { renderHook, act, waitFor } from '@testing-library/react';

const mockUseAuth = jest.fn();
const mockAdminPermissions = {
    checkIsAdmin: jest.fn()
};

jest.mock('../../components/Auth/useAuth', () => ({
    useAuth: mockUseAuth
}));

jest.mock('../../utils/adminPermissions', () => mockAdminPermissions);

const { useAdminPermissions } = require('../useAdminPermissions');

describe('useAdminPermissions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: null,
            isAuthenticated: false,
            loading: false,
            isAdmin: undefined,
            adminLoading: false
        });
    });

    it('stays false and skips API calls for unauthenticated users', () => {
        const { result } = renderHook(() => useAdminPermissions());

        expect(result.current.isAdmin).toBe(false);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.shouldShowAdminFeatures()).toBe(false);
        expect(mockAdminPermissions.checkIsAdmin).not.toHaveBeenCalled();
    });

    it('uses AuthContext admin state without issuing an API request', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'admin-1', email: 'admin@example.com' },
            isAuthenticated: true,
            loading: false,
            isAdmin: true,
            adminLoading: false
        });

        const { result } = renderHook(() => useAdminPermissions());

        await waitFor(() => {
            expect(result.current.isAdmin).toBe(true);
        });

        expect(result.current.shouldShowAdminFeatures()).toBe(true);
        expect(mockAdminPermissions.checkIsAdmin).not.toHaveBeenCalled();
    });

    it('falls back to API checks when AuthContext has no admin status yet', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'user-1', email: 'user@example.com' },
            isAuthenticated: true,
            loading: false,
            isAdmin: undefined,
            adminLoading: false
        });
        mockAdminPermissions.checkIsAdmin.mockResolvedValue(true);

        const { result } = renderHook(() => useAdminPermissions());

        await waitFor(() => {
            expect(result.current.isAdmin).toBe(true);
        });

        expect(mockAdminPermissions.checkIsAdmin).toHaveBeenCalledTimes(1);
        expect(result.current.shouldShowAdminFeatures()).toBe(true);
    });

    it('surfaces API failures and keeps admin access disabled', async () => {
        const apiError = new Error('Admin API unavailable');

        mockUseAuth.mockReturnValue({
            user: { id: 'user-2', email: 'user2@example.com' },
            isAuthenticated: true,
            loading: false,
            isAdmin: undefined,
            adminLoading: false
        });
        mockAdminPermissions.checkIsAdmin.mockRejectedValue(apiError);

        const { result } = renderHook(() => useAdminPermissions());

        await waitFor(() => {
            expect(result.current.error).toBe(apiError);
        });

        expect(result.current.isAdmin).toBe(false);
        expect(result.current.shouldShowAdminFeatures()).toBe(false);
    });

    it('retries transient admin check failures and recovers on the next attempt', async () => {
        jest.useFakeTimers();
        try {
            const transientError = new Error('Transient admin API failure');

            mockUseAuth.mockReturnValue({
                user: { id: 'user-4', email: 'user4@example.com' },
                isAuthenticated: true,
                loading: false,
                isAdmin: undefined,
                adminLoading: false
            });
            mockAdminPermissions.checkIsAdmin
                .mockRejectedValueOnce(transientError)
                .mockResolvedValueOnce(true);

            const { result } = renderHook(() => useAdminPermissions());

            await waitFor(() => {
                expect(mockAdminPermissions.checkIsAdmin).toHaveBeenCalledTimes(1);
                expect(result.current.error).toBe(transientError);
                expect(result.current.isAdmin).toBe(false);
            });

            await act(async () => {
                jest.advanceTimersByTime(15000);
            });

            await waitFor(() => {
                expect(mockAdminPermissions.checkIsAdmin).toHaveBeenCalledTimes(2);
                expect(result.current.isAdmin).toBe(true);
            });
        } finally {
            jest.useRealTimers();
        }
    });

    it('reports combined loading state and exposes debug info', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'user-3', email: 'user3@example.com' },
            isAuthenticated: true,
            loading: false,
            isAdmin: undefined,
            adminLoading: true
        });

        const { result } = renderHook(() => useAdminPermissions());

        expect(result.current.loading).toBe(true);

        await act(async () => {
            const status = await result.current.checkAdminStatus();
            expect(status).toBe(false);
        });

        expect(mockAdminPermissions.checkIsAdmin).not.toHaveBeenCalled();
        expect(result.current.getDebugInfo()).toEqual(expect.objectContaining({
            hookState: expect.objectContaining({
                isAdmin: false,
                isAuthenticated: true,
                hasUser: true
            }),
            authContextState: expect.objectContaining({
                authContextAdminLoading: true,
                authLoading: false
            }),
            shouldShowAdminFeatures: false
        }));
    });
});
