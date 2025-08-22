import { HttpError, TaggedError } from '../utils/logging';
import { Publisher } from '../types/publisher';

export const SERVICE_URL = 'https://api.buttondown.email/v1/emails';

export class ButtondownPublisher extends Publisher {
  readonly name = 'buttondown';

  enabled(): boolean {
    return process.env.SEND_ENABLED === 'true';
  }

  async publish(content: string): Promise<string> {
    const apiKey = process.env.BUTTONDOWN_API_KEY;
    if (!apiKey) {
      throw new TaggedError('config', 'BUTTONDOWN_API_KEY required when SEND_ENABLED=true');
    }

    const response = await fetch(SERVICE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: this.subject(),
        body: content,
        email_type: 'public',
      }),
    });

    if (!response.ok) {
      throw new HttpError('buttondown', 'email sending failed', response);
    }

    const json = await response.json();
    return json.id;
  }
}
