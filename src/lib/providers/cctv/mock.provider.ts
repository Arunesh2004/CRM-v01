import { CameraProvider, CameraStreamInfo } from './camera-provider.interface';

export class MockCameraProvider implements CameraProvider {
  async getStreamStatus(cameraId: string): Promise<CameraStreamInfo> {
    // For demo purposes, we randomly simulate a slightly degraded or offline state occasionally,
    // but default to ONLINE for a smooth demo.
    const rand = Math.random();
    let status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' = 'ONLINE';
    if (rand > 0.95) status = 'OFFLINE';
    else if (rand > 0.85) status = 'DEGRADED';

    return {
      status,
      streamUrl: status === 'OFFLINE' ? null : 'mock://stream/video.mp4',
      resolution: '1080p',
      fps: 30,
      lastHeartbeat: new Date(),
    };
  }

  async getProviderHealth(): Promise<{ healthy: boolean; latencyMs?: number }> {
    return {
      healthy: true,
      latencyMs: Math.floor(Math.random() * 50) + 10,
    };
  }
}
