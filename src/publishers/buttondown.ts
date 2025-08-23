import { Publisher } from '../types/publisher';
import { ButtondownClient } from '../clients/buttondown';

export class ButtondownPublisher extends Publisher {
  readonly name = 'buttondown';

  enabled(): boolean {
    return process.env.SEND_ENABLED === 'true';
  }

  async publish(content: string): Promise<string> {
    const client = new ButtondownClient(process.env.BUTTONDOWN_API_KEY);
    const result = await client.sendEmail({
      subject: this.subject(),
      body: content,
      email_type: 'public',
    });

    return result.id;
  }
}
