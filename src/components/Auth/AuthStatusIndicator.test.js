import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthStatusIndicator } from './AuthStatusIndicator';
import { useAuth } from './useAuth';

jest.mock('./useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('./UserProfile', () => ({ UserProfile: () => <div>Profile</div> }));
jest.mock('../Common/Dialog/useDialog', () => ({ useDialog: () => ({ openDialog: jest.fn() }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: () => '登入' }) }));
jest.mock('../../utils/authPreloader', () => ({ getPreloadedState: () => null }));

it('keeps the same navigation slot while authentication resolves', () => {
  useAuth.mockReturnValue({ user: null, loading: true });
  const { container, rerender } = render(<AuthStatusIndicator />);
  const slot = container.querySelector('.auth-status-slot');
  expect(slot).toContainElement(container.querySelector('.auth-skeleton'));

  useAuth.mockReturnValue({ user: null, loading: false });
  rerender(<AuthStatusIndicator />);
  expect(container.querySelector('.auth-status-slot')).toBe(slot);
  expect(slot).toContainElement(screen.getByRole('button', { name: '登入' }));
});
