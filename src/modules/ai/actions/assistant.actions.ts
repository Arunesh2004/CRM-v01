'use server';

import { askAssistant } from '../assistant.service';

export async function askAssistantAction(prompt: string) {
  try {
    if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
      throw new Error('Invalid prompt');
    }
    const response = await askAssistant(prompt);
    return { success: true, data: response };
  } catch (error: any) {
    return { success: false, error: error.message || 'Assistant failed to respond.' };
  }
}
