import { Newsletter } from '../utils/types';

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
      messageId: 'mock-disabled-' + Date.now(),
    };
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    throw new Error(
      '[FATAL] config: BUTTONDOWN_API_KEY environment variable required when SEND_ENABLED=true'
    );
  }

  try {
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
      const errorText = await response.text();
      throw new Error(
        `[ERROR] buttondown-api: request failed (status=${response.status} response=${errorText})`
      );
    }

    const result = await response.json();

    return {
      success: true,
      messageId: result.id,
    };
  } catch (error) {
    console.error(
      '[ERROR] send: newsletter delivery failed (reason=%s)',
      error instanceof Error ? error.message : 'unknown'
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
