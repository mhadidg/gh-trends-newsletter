import { HttpError, TaggedError } from '../utils/logging';

export interface ButtondownPayload {
  subject: string;
  body: string;
  email_type: string;
}

export class ButtondownClient {
  public static readonly baseUrl = 'https://api.buttondown.email/v1/emails';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new TaggedError('config', 'BUTTONDOWN_API_KEY required');
    }

    this.apiKey = apiKey;
  }

  async sendEmail(email: ButtondownPayload): Promise<{ id: string }> {
    const response = await fetch(ButtondownClient.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(email),
    });

    if (!response.ok) {
      throw new HttpError('buttondown', 'email sending failed', response);
    }

    const json = await response.json();
    return { id: json.id };
  }
}
