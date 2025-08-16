/**
 * AdminOnly Component Tests
 * 
 * Tests for the AdminOnly conditional rendering component.
 * Covers rendering logic, loading states, and error handling.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the useAdminPermissions hook first
const mockUseAdminPermissions = jest.fn();

jest.mock('../../../hooks/useAdminPermissions', () => ({
    useAdminPermissions: mockUseAdminPermissions
}));

// Import after mocking
const AdminOnly = require('../AdminOnly').default;

describe('AdminOnly', () => {
    const defaultHookReturn = {
        isAdmin: false,
        loading: false,
        error: null,
        shouldShowAdminFeatures: false,
        getDebugInfo: jest.fn()
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAdminPermissions.mockReturnValue(defaultHookReturn);
        
        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('admin content rendering', () => {
        it('should render children when user is admin', () => {
            // Arrange
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                isAdmin: true,
                shouldShowAdminFeatures: true
            });
            
            // Act
            render(
                <AdminOnly>
                    <div data-testid="admin-content">Admin Only Content</div>
                </AdminOnly>
            );
            
            // Assert
            expect(screen.getByTestId('admin-content')).toBeInTheDocument();
            expect(screen.getByText('Admin Only Content')).toBeInTheDocument();
        });
        
        it('should not render children when user is not admin', () => {
            // Arrange
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                isAdmin: false,
                shouldShowAdminFeatures: false
            });
            
            // Act
            render(
                <AdminOnly>
                    <div data-testid="admin-content">Admin Only Content</div>
                </AdminOnly>
            );
            
            // Assert
            expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        });
        
        it('should render children with container when className is provided', () => {
            // Arrange
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                isAdmin: true,
                shouldShowAdminFeatures: true
            });
            
            // Act
            render(
                <AdminOnly className="custom-admin-class">
                    <div data-testid="admin-content">Admin Only Content</div>
                </AdminOnly>
            );
            
            // Assert
            const container = screen.getByTestId('admin-content').parentElement;
            expect(container).toHaveClass('admin-only-container');
            expect(container).toHaveClass('custom-admin-class');
        });
    });
    
    describe('fallback content rendering', () => {
        it('should render fallback when user is not admin and fallback is provided', () => {
            // Arrange
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                isAdmin: false,
                shouldShowAdminFeatures: false
            });
            
            // Act
            render(
                <AdminOnly fallback={<div data-testid="fallback-content">Not Admin</div>}>
                    <div data-testid="admin-content">Admin Only Content</div>
                </AdminOnly>
            );
            
            // Assert
            expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
            expect(screen.getByText('Not Admin')).toBeInTheDocument();
            expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        });
        
        it('should render null when user is not admin and no fallback is provided', () => {
            // Arrange
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                isAdmin: false,
                shouldShowAdminFeatures: false
            });
            
            // Act
            const { container } = render(
                <AdminOnly>
                    <div data-testid="admin-content">Admin Only Content</div>
                </AdminOnly>
            );
            
            // Assert
            expect(container.firstChild).toBeNull();
            expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        });
    });
    
    describe('loading state', () => {
        it('should render loading state when showLoading is true and loading', () => {
            // Arrange
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                loading: true
            });
            
            // Act
            render(
                <AdminOnly showLoading={true}>
                    <div data-testid="admin-content">Admin Only Content</div>
                </AdminOnly>
            );
            
            // Assert
            expect(screen.getByText('Checking permissions...')).toBeInTheDocument();
            expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        });
        
        it('should render custom loading component when provided', () => {
            // Arrange
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                loading: true
            });
            
            const customLoading = <div data-testid="custom-loading">Custom Loading</div>;
            
            // Act
            render(
                <AdminOnly showLoading={true} loadingComponent={customLoading}>
                    <div data-testid="admin-content">Admin Only Content</div>
                </AdminOnly>
            );
            
            // Assert
            expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
            expect(screen.getByText('Custom Loading')).toBeInTheDocument();
            expect(screen.queryByText('Checking permissions...')).not.toBeInTheDocument();
        });
        
        it('should not render loading state when showLoading is false', () => {
            // Arrange
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                loading: true
            });
            
            // Act
            render(
                <AdminOnly showLoading={false}>
                    <div data-testid="admin-content">Admin Only Content</div>
                </AdminOnly>
            );
            
            // Assert
            expect(screen.queryByText('Checking permissions...')).not.toBeInTheDocument();
            expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        });
    });
    
    describe('debug mode', () => {
        it('should log debug information when debug is true in development', () => {
            // Arrange
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            
            const mockGetDebugInfo = jest.fn().mockReturnValue({
                adminStatus: false,
                loading: false
            });
            
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                getDebugInfo: mockGetDebugInfo
            });
            
            // Act
            render(
                <AdminOnly debug={true}>
                    <div data-testid="admin-content">Admin Only Content</div>
                </AdminOnly>
            );
            
            // Assert
            expect(console.log).toHaveBeenCalledWith(
                'AdminOnly component render:',
                expect.objectContaining({
                    isAdmin: false,
                    loading: false,
                    shouldShowAdminFeatures: false,
                    hasChildren: true,
                    hasFallback: false
                })
            );
            expect(mockGetDebugInfo).toHaveBeenCalled();
            
            // Cleanup
            process.env.NODE_ENV = originalEnv;
        });
        
        it('should not log debug information in production', () => {
            // Arrange
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            // Act
            render(
                <AdminOnly debug={true}>
                    <div data-testid="admin-content">Admin Only Content</div>
                </AdminOnly>
            );
            
            // Assert
            expect(console.log).not.toHaveBeenCalled();
            
            // Cleanup
            process.env.NODE_ENV = originalEnv;
        });
    });
    
    describe('edge cases', () => {
        it('should handle multiple children', () => {
            // Arrange
            mockUseAdminPermissions.mockReturnValue({
                ...defaultHookReturn,
                isAdmin: true,
                shouldShowAdminFeatures: true
            });
            
            // Act
            render(
                <AdminOnly>
                    <div data-testid="child1">Child 1</div>
                    <div data-testid="child2">Child 2</div>
                    <div data-testid="child3">Child 3</div>
                </AdminOnly>
            );
            
            // Assert
            expect(screen.getByTestId('child1')).toBeInTheDocument();
            expect(screen.getByTestId('child2')).toBeInTheDocument();
            expect(screen.getByTestId('child3')).toBeInTheDocument();
        });
    });
});