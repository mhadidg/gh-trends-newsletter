import { Newsletter } from '../utils/types';
import { TaggedError, HttpError } from '../utils/logging';

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function send(newsletter: Newsletter): Promise<SendResult> {
  const sendEnabled = process.env.SEND_ENABLED === 'true';
  if (!sendEnabled) {
    return {
      success: true,
      messageId: 'mock-disabled',
    };
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    throw new TaggedError('config', 'BUTTONDOWN_API_KEY var required when SEND_ENABLED=true');
  }

  const response = await fetch('https://api.buttondown.email/v1/emails', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: newsletter.subject,
      body: newsletter.content,
      email_type: 'public',
    }),
  });

  if (!response.ok) {
    throw new HttpError('buttondown', 'email sending failed', response);
  }

  const result = await response.json();
  return {
    success: true,
    messageId: result.id ?? null,
  };
}
