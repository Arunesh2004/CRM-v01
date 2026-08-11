'use server';

import { askAssistant } from '../assistant.service';
import { requireAuth } from '@/lib/auth';
import { AIConfig } from '@/lib/config/ai.config';

// In-memory concurrency limiter fallback.
// This is scoped per Node instance and does NOT provide global lock protection
// in serverless deployments, but prevents accidental spam clicks on a single instance.
const activeRequests = new Map<string, boolean>();

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function askAssistantAction(prompt: string, history?: ChatMessage[]) {
  let userId = 'anonymous';
  try {
    const user = await requireAuth();
    userId = user.id;

    if (activeRequests.get(userId)) {
      return { success: false, error: 'AI is currently processing another request. Please wait.' };
    }

    if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
      return { success: false, error: 'Invalid prompt.' };
    }

    // Validate and bound history to ensure it can never overwhelm context limits
    let validHistory: ChatMessage[] = [];
    if (Array.isArray(history)) {
      const sanitized = history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content.length > AIConfig.MAX_HISTORY_MSG_CHARS
            ? m.content.substring(0, AIConfig.MAX_HISTORY_MSG_CHARS) + '...[truncated]'
            : m.content
        }));

      // Slice array to keep only the most recent N messages
      validHistory = sanitized.slice(-AIConfig.MAX_HISTORY_MESSAGES);

      // Ensure total string length of history doesn't violate overall history bounds
      let totalChars = 0;
      const budgetHistory: ChatMessage[] = [];
      // Traverse backwards to retain the most recent context
      for (let i = validHistory.length - 1; i >= 0; i--) {
        const msg = validHistory[i];
        if (totalChars + msg.content.length <= AIConfig.MAX_HISTORY_TOTAL_CHARS) {
          budgetHistory.unshift(msg);
          totalChars += msg.content.length;
        } else {
          break; // Stop adding older messages if budget exceeded
        }
      }
      validHistory = budgetHistory;
    }

    // Set lock
    activeRequests.set(userId, true);

    // Generate simple UUID or random string if crypto isn't available
    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    const response = await askAssistant(prompt, requestId, validHistory);
    return { success: true, data: response };
  } catch (error: any) {
    let msg = error.message || 'Assistant failed to respond.';
    if (msg === 'RATE_LIMITED') {
      msg = 'You have exceeded the allowed number of requests. Please try again later.';
    }
    return { success: false, error: msg };
  } finally {
    // Release lock
    if (userId !== 'anonymous') {
      activeRequests.delete(userId);
    }
  }
}
