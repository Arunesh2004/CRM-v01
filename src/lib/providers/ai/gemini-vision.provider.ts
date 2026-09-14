import { GoogleGenAI } from '@google/genai';
import { VisionInferenceProvider, VisionInput, NormalizedDetection, VisionCapabilities } from './vision-provider.interface';
import { Logger } from '../../logger/logger';

export class GeminiVisionProvider implements VisionInferenceProvider {
  private ai?: GoogleGenAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
    this.modelName = process.env.AI_VISION_MODEL || 'gemini-3.5-flash';
  }

  getCapabilities(): VisionCapabilities {
    return {
      supportsUrlInput: true, // Note: For standard Gemini SDK, passing remote URLs might require specific GCS/media format or file API. 
      // For this adapter, we will assume it supports fetching/processing, but if it's a signed URL we might need to fetch bytes first if the SDK requires it.
      // Wait, the SDK requires inline data or uploading via File API. For a signed URL, we either fetch it or assume it's acceptable.
      supportsBytesInput: true,
      supportsVideo: true,
      maxFrames: 15, // Arbitrary safe limit for this implementation
    };
  }

  async analyze(input: VisionInput): Promise<NormalizedDetection[]> {
    if (!this.ai) {
      Logger.warn('[GEMINI VISION] Generation requested but AI provider is not configured.');
      throw new Error('AI_PROVIDER_NOT_CONFIGURED');
    }

    if (input.type === 'URL' && !this.getCapabilities().supportsUrlInput) {
      throw new Error('UNSUPPORTED_CAPABILITY: URL input not supported by this provider');
    }

    // Prepare media part
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mediaPart: any;
    
    if (input.type === 'URL') {
      // If we receive a URL, we must fetch the bytes since Gemini SDK typically needs inlineData or File URI
      try {
        const fetchTimeout = new AbortController();
        const timeoutId = setTimeout(() => fetchTimeout.abort(), 10000);
        const res = await fetch(input.data as string, { signal: fetchTimeout.signal });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`Failed to fetch media from URL: ${res.status}`);
        
        const arrayBuffer = await res.arrayBuffer();
        mediaPart = {
          inlineData: {
            data: Buffer.from(arrayBuffer).toString('base64'),
            mimeType: input.mimeType,
          }
        };
      } catch (error) {
        throw new Error(`Media fetch failed: ${(error as Error).message}`);
      }
    } else {
      // BYTES
      const base64Data = Buffer.isBuffer(input.data) 
        ? input.data.toString('base64') 
        : input.data as string;
        
      mediaPart = {
        inlineData: {
          data: base64Data,
          mimeType: input.mimeType,
        }
      };
    }

    const prompt = `Analyze this security camera frame/segment. Identify if any of the following are present: Motion. 
Return ONLY a valid JSON array of objects, where each object has:
- "eventType": string (must be "MOTION")
- "confidence": number (between 0.0 and 1.0)
- "metadata": optional object with additional details

If nothing is detected, return an empty array [].`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s explicit timeout

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: [
          mediaPart,
          { text: prompt }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          // @ts-expect-error - Some versions of GoogleGenAI SDK support custom fetch, injecting signal to abort underlying request
          httpOptions: { fetch: (url: RequestInfo | URL, init?: RequestInit) => fetch(url, { ...init, signal: controller.signal }) }
        }
      });
      clearTimeout(timeoutId);

      const text = response.text || '[]';
      // Basic parse, Zod validation happens upstream
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('Provider returned malformed JSON (not an array)');
      }

      // Convert to normalized detection (trusting the upstream CameraEventService to validate thoroughly)
      return parsed.map(item => ({
        eventType: item.eventType,
        confidence: item.confidence,
        metadata: item.metadata,
        timestamp: new Date(), // Use current time as inference time
      }));
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('JSON')) {
        throw new Error(`Provider returned malformed JSON: ${msg}`);
      }
      if (msg.includes('abort') || (error as Error).name === 'AbortError') {
         throw new Error(`Provider timeout: Gemini API took longer than 15s`);
      }
      throw new Error(`Provider execution failed: ${msg}`);
    }
  }
}
