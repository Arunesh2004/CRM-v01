import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CameraStreamPlayer } from '@/components/cctv/CameraStreamPlayer';
import * as webRtcHook from '@/hooks/useMediaMTXWebRTC';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/hooks/useMediaMTXWebRTC', () => ({
  useMediaMTXWebRTC: vi.fn(),
}));

describe('CameraStreamPlayer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders loading state initially', () => {
    vi.spyOn(webRtcHook, 'useMediaMTXWebRTC').mockReturnValue({
      status: 'loading',
      errorType: null,
      stream: null,
      retry: vi.fn(),
    });

    render(<CameraStreamPlayer cameraId="cam-1" />);
    
    expect(screen.getByText('Connecting to stream...')).toBeDefined();
  });

  it('renders connected video stream', () => {
    vi.spyOn(webRtcHook, 'useMediaMTXWebRTC').mockReturnValue({
      status: 'connected',
      errorType: null,
      stream: null,
      retry: vi.fn(),
    });

    render(<CameraStreamPlayer cameraId="cam-1" />);
    
    // The video tag is present, not showing overlays
    expect(screen.queryByText('Connecting to stream...')).toBeNull();
    expect(screen.queryByText('Reconnecting...')).toBeNull();
    expect(screen.queryByText('Connection Failed')).toBeNull();
  });

  it('renders reconnecting state', () => {
    vi.spyOn(webRtcHook, 'useMediaMTXWebRTC').mockReturnValue({
      status: 'reconnecting',
      errorType: null,
      stream: null,
      retry: vi.fn(),
    });

    render(<CameraStreamPlayer cameraId="cam-1" />);
    
    expect(screen.getByText('Reconnecting...')).toBeDefined();
  });

  it('renders error state for network failure', () => {
    const retryMock = vi.fn();
    vi.spyOn(webRtcHook, 'useMediaMTXWebRTC').mockReturnValue({
      status: 'error',
      errorType: 'NETWORK_ERROR',
      stream: null,
      retry: retryMock,
    });

    render(<CameraStreamPlayer cameraId="cam-1" />);
    
    expect(screen.getByText('Connection Failed')).toBeDefined();
    expect(screen.getByText('Network connection lost.')).toBeDefined();

    const retryButton = screen.getByRole('button', { name: /Try Again/i });
    expect(retryButton).toBeDefined();
    
    fireEvent.click(retryButton);
    expect(retryMock).toHaveBeenCalledOnce();
  });
});
