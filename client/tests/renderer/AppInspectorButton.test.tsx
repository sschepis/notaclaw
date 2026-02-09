import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/renderer/App';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';

// Mock electronAPI
const mockElectronAPI = {
  checkIdentity: jest.fn().mockResolvedValue(true),
  getAISettings: jest.fn().mockResolvedValue({ providers: [{ enabled: true }] }),
  onMessage: jest.fn(() => jest.fn()),
  onWalletUpdate: jest.fn(() => jest.fn()),
  onAgentStateUpdate: jest.fn(() => jest.fn()),
  onSMFUpdate: jest.fn(() => jest.fn()),
  onNetworkUpdate: jest.fn(() => jest.fn()),
  onDirectMessage: jest.fn(() => jest.fn()),
  onRoomMessage: jest.fn(() => jest.fn()),
  onFriendRequest: jest.fn(() => jest.fn()),
  onGroupPost: jest.fn(() => jest.fn()),
  onAgentStep: jest.fn(() => jest.fn()),
  onWalletTransaction: jest.fn(() => jest.fn()),
  onRequestLocalInference: jest.fn(() => jest.fn()),
  aiConversationList: jest.fn().mockResolvedValue([]),
};

// @ts-ignore
window.electronAPI = mockElectronAPI;

// Mock child components to avoid deep rendering issues
jest.mock('../../src/renderer/components/layout/NavRail', () => ({
  NavRail: () => <div data-testid="nav-rail">NavRail</div>
}));
jest.mock('../../src/renderer/components/layout/LayoutManager', () => ({
  LayoutManager: ({ inspectorOpen }: any) => <div data-testid="layout-manager">LayoutManager: {inspectorOpen ? 'Open' : 'Closed'}</div>
}));
jest.mock('../../src/renderer/components/layout/AppMenuBar', () => ({
  AppMenuBar: () => <div data-testid="app-menu-bar">AppMenuBar</div>
}));
jest.mock('../../src/renderer/components/settings/SettingsModal', () => ({
  SettingsModal: () => <div data-testid="settings-modal">SettingsModal</div>
}));
jest.mock('../../src/renderer/components/onboarding/OnboardingScreen', () => ({
  OnboardingScreen: () => <div data-testid="onboarding-screen">OnboardingScreen</div>
}));
jest.mock('../../src/renderer/services/PluginLoader', () => ({
  PluginLoader: {
    getInstance: () => ({
      initialize: jest.fn().mockResolvedValue(undefined)
    })
  }
}));
jest.mock('../../src/renderer/services/WebLLMService', () => ({
    webLLMService: {
        isInitialized: jest.fn().mockReturnValue(false),
        initialize: jest.fn().mockResolvedValue(undefined),
        chat: jest.fn().mockResolvedValue({ choices: [{ message: { content: 'mock' } }] })
    }
}));

describe('App Inspector Button', () => {
  it('renders inspector toggle button and toggles inspector state', async () => {
    await act(async () => {
      render(<App />);
    });

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('INITIALIZING')).not.toBeInTheDocument();
    });

    // Check if LayoutManager shows closed initially
    expect(screen.getByTestId('layout-manager')).toHaveTextContent('LayoutManager: Closed');

    // Find the button by title
    const toggleButton = screen.getByTitle('Open Inspector');
    expect(toggleButton).toBeInTheDocument();

    // Click it
    fireEvent.click(toggleButton);

    // Check if LayoutManager shows open
    expect(screen.getByTestId('layout-manager')).toHaveTextContent('LayoutManager: Open');
    
    // Button title should change
    expect(toggleButton).toHaveAttribute('title', 'Close Inspector');
  });
});
