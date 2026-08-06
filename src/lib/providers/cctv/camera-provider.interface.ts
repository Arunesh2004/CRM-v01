export interface CameraStreamInfo {
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  streamUrl: string | null;
  resolution?: string;
  fps?: number;
  lastHeartbeat?: Date;
}

export interface CameraProvider {
  /**
   * Retrieves the current live status and stream URL for a given camera.
   */
  getStreamStatus(cameraId: string): Promise<CameraStreamInfo>;
  
  /**
   * Checks the health of the underlying provider connection.
   */
  getProviderHealth(): Promise<{ healthy: boolean; latencyMs?: number }>;
}
