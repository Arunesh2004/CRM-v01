export type VisionInputType = 'URL' | 'BYTES';

export interface VisionInput {
  type: VisionInputType;
  /**
   * Depending on type:
   * - URL: A short-lived presigned URL (e.g. S3).
   * - BYTES: A base64 encoded string or raw Buffer (for providers not supporting URLs).
   */
  data: string | Buffer;
  mimeType: string;
}

export interface VisionCapabilities {
  supportsUrlInput: boolean;
  supportsBytesInput: boolean;
  supportsVideo: boolean;
  maxFrames: number;
}

export interface NormalizedDetection {
  eventType: string; // e.g., 'MOTION', 'PERSON', 'VEHICLE'
  confidence: number; // 0.0 to 1.0
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface VisionInferenceProvider {
  /**
   * Identifies the capabilities of this provider to ensure safe routing.
   */
  getCapabilities(): VisionCapabilities;

  /**
   * Analyzes vision input (image or video) and returns a list of normalized detections.
   * Throws an explicit error if the provider is unconfigured or if the input is unsupported.
   */
  analyze(input: VisionInput): Promise<NormalizedDetection[]>;
}
