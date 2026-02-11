import { activate, deactivate } from '../renderer/index';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock context
const mockContext = {
  ui: {
    registerNavigation: jest.fn(() => jest.fn()),
  },
  dsn: {
    registerTool: jest.fn(),
  },
  useAppStore: {
    getState: jest.fn(() => ({
      setActiveSidebarView: jest.fn(),
    })),
  },
  _cleanups: [],
};

describe('Hello World Plugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext._cleanups = [];
  });

  test('activate registers navigation and tool', () => {
    activate(mockContext);

    expect(mockContext.ui.registerNavigation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'hello-world-nav',
        label: 'Hello World',
      })
    );

    expect(mockContext.dsn.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'say_hello',
        description: 'Says hello to the user',
      }),
      expect.any(Function)
    );
  });

  test('deactivate calls cleanup functions', () => {
    const cleanupMock = jest.fn();
    mockContext._cleanups = [cleanupMock];

    deactivate(mockContext);

    expect(cleanupMock).toHaveBeenCalled();
  });
  
  // To test the component, we'd need to extract it or simulate the navigation registration callback.
  // For now, we are testing the integration logic.
});
