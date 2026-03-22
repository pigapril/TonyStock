import React from 'react';
import { render, screen } from '@testing-library/react';

const mockUseAdminPermissions = jest.fn();

jest.mock('../../../hooks/useAdminPermissions', () => ({
    useAdminPermissions: mockUseAdminPermissions
}));

const AdminOnly = require('../AdminOnly').default;

describe('AdminOnly', () => {
    const defaultHookReturn = {
        isAdmin: false,
        loading: false,
        error: null,
        shouldShowAdminFeatures: () => false,
        getDebugInfo: jest.fn(() => ({ source: 'test' }))
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAdminPermissions.mockReturnValue(defaultHookReturn);
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('renders children only when the hook says admin features should be shown', () => {
        mockUseAdminPermissions.mockReturnValue({
            ...defaultHookReturn,
            isAdmin: true,
            shouldShowAdminFeatures: () => true
        });

        render(
            <AdminOnly>
                <div data-testid="admin-content">Admin Content</div>
            </AdminOnly>
        );

        expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    });

    it('renders fallback content for non-admin users', () => {
        render(
            <AdminOnly fallback={<div data-testid="fallback-content">No Access</div>}>
                <div data-testid="admin-content">Admin Content</div>
            </AdminOnly>
        );

        expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('shows the default loading state when requested', () => {
        mockUseAdminPermissions.mockReturnValue({
            ...defaultHookReturn,
            loading: true
        });

        render(
            <AdminOnly showLoading={true}>
                <div data-testid="admin-content">Admin Content</div>
            </AdminOnly>
        );

        expect(screen.getByText('Checking permissions...')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('renders a custom loading component when provided', () => {
        mockUseAdminPermissions.mockReturnValue({
            ...defaultHookReturn,
            loading: true
        });

        render(
            <AdminOnly
                showLoading={true}
                loadingComponent={<div data-testid="custom-loading">Loading...</div>}
            >
                <div data-testid="admin-content">Admin Content</div>
            </AdminOnly>
        );

        expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
        expect(screen.queryByText('Checking permissions...')).not.toBeInTheDocument();
    });

    it('logs resolved admin visibility in development debug mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        try {
            const getDebugInfo = jest.fn(() => ({ adminState: 'allowed' }));
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                isAdmin: true,
                shouldShowAdminFeatures: () => true,
                getDebugInfo
            });

            render(
                <AdminOnly debug={true}>
                    <div data-testid="admin-content">Admin Content</div>
                </AdminOnly>
            );

            expect(console.log).toHaveBeenCalledWith(
                'AdminOnly component render:',
                expect.objectContaining({
                    isAdmin: true,
                    shouldShowAdminFeatures: true,
                    hasChildren: true
                })
            );
            expect(getDebugInfo).toHaveBeenCalled();
        } finally {
            process.env.NODE_ENV = originalEnv;
        }
    });
});
