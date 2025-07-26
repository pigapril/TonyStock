// Storybook story for QuotaExceededDialog component
// This can be used for manual testing and UI development

import React from 'react';
import { QuotaExceededDialog } from './QuotaExceededDialog';
import { DialogProvider } from './DialogContext';

// Mock the useDialog hook for Storybook
const MockDialogProvider = ({ children, dialogState }) => {
  const mockContext = {
    dialog: dialogState,
    openDialog: () => {},
    closeDialog: () => {}
  };

  return (
    <div>
      {React.cloneElement(children, { mockContext })}
    </div>
  );
};

export default {
  title: 'Components/Dialog/QuotaExceededDialog',
  component: QuotaExceededDialog,
  decorators: [
    (Story) => (
      <DialogProvider>
        <Story />
      </DialogProvider>
    ),
  ],
};

export const Default = () => {
  // Mock the dialog state for the default story
  const mockUseDialog = () => ({
    dialog: {
      type: 'quotaExceeded',
      isOpen: true,
      props: {}
    },
    closeDialog: () => console.log('Dialog closed')
  });

  // Temporarily override the useDialog hook
  const originalModule = require('./useDialog');
  originalModule.useDialog = mockUseDialog;

  return <QuotaExceededDialog />;
};

export const WithQuotaDetails = () => {
  const mockUseDialog = () => ({
    dialog: {
      type: 'quotaExceeded',
      isOpen: true,
      props: {
        quota: 1000,
        usage: 1000,
        resetTime: '2024-01-01T12:00:00Z',
        message: 'You have exceeded your daily usage limit.'
      }
    },
    closeDialog: () => console.log('Dialog closed')
  });

  const originalModule = require('./useDialog');
  originalModule.useDialog = mockUseDialog;

  return <QuotaExceededDialog />;
};

export const WithCustomUpgradeUrl = () => {
  const mockUseDialog = () => ({
    dialog: {
      type: 'quotaExceeded',
      isOpen: true,
      props: {
        quota: 500,
        usage: 500,
        resetTime: '2024-01-01T18:30:00Z',
        upgradeUrl: 'https://example.com/premium-plans',
        message: 'Your free plan limit has been reached. Upgrade to continue using our services.'
      }
    },
    closeDialog: () => console.log('Dialog closed')
  });

  const originalModule = require('./useDialog');
  originalModule.useDialog = mockUseDialog;

  return <QuotaExceededDialog />;
};

export const MinimalMessage = () => {
  const mockUseDialog = () => ({
    dialog: {
      type: 'quotaExceeded',
      isOpen: true,
      props: {
        message: 'Usage limit reached. Please try again later.'
      }
    },
    closeDialog: () => console.log('Dialog closed')
  });

  const originalModule = require('./useDialog');
  originalModule.useDialog = mockUseDialog;

  return <QuotaExceededDialog />;
};