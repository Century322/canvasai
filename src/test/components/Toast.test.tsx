import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Toast from '../../../components/Toast';
import { ToastNotification } from '../../../types';

describe('Toast', () => {
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should render toast messages', () => {
    const toasts: ToastNotification[] = [
      { id: '1', message: 'Success message', type: 'success' },
    ];

    render(<Toast toasts={toasts} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('should render multiple toasts', () => {
    const toasts: ToastNotification[] = [
      { id: '1', message: 'First toast', type: 'success' },
      { id: '2', message: 'Second toast', type: 'error' },
    ];

    render(<Toast toasts={toasts} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('should call onDismiss when X button is clicked', () => {
    const toasts: ToastNotification[] = [
      { id: '1', message: 'Test toast', type: 'info' },
    ];

    render(<Toast toasts={toasts} onDismiss={mockOnDismiss} />);
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(mockOnDismiss).toHaveBeenCalledWith('1');
  });

  it('should auto-dismiss after 3 seconds', async () => {
    vi.useFakeTimers();
    
    const toasts: ToastNotification[] = [
      { id: '1', message: 'Auto dismiss toast', type: 'success' },
    ];

    render(<Toast toasts={toasts} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('Auto dismiss toast')).toBeInTheDocument();
    
    vi.advanceTimersByTime(3000);
    
    expect(mockOnDismiss).toHaveBeenCalledWith('1');
    
    vi.useRealTimers();
  });

  it('should render error toast with correct styling', () => {
    const toasts: ToastNotification[] = [
      { id: '1', message: 'Error message', type: 'error' },
    ];

    render(<Toast toasts={toasts} onDismiss={mockOnDismiss} />);
    
    const toastElement = screen.getByText('Error message').closest('div');
    expect(toastElement?.className).toContain('bg-red-50');
  });

  it('should render success toast with correct styling', () => {
    const toasts: ToastNotification[] = [
      { id: '1', message: 'Success message', type: 'success' },
    ];

    render(<Toast toasts={toasts} onDismiss={mockOnDismiss} />);
    
    const toastElement = screen.getByText('Success message').closest('div');
    expect(toastElement?.className).toContain('bg-white');
  });

  it('should render empty state when no toasts', () => {
    const toasts: ToastNotification[] = [];

    const { container } = render(<Toast toasts={toasts} onDismiss={mockOnDismiss} />);
    
    expect(container.firstChild).toBeEmptyDOMElement();
  });
});
