import { Publisher } from '../types/publisher';
import { ButtondownClient } from '../clients/buttondown';
import { ScoredRepository } from '../types/repository';
import { render } from '../pipeline/render';

export class ButtondownPublisher extends Publisher {
  readonly name = 'buttondown';

  enabled(): boolean {
    return process.env.SEND_ENABLED === 'true';
  }

  render(repos: ScoredRepository[]): string {
    return render('release.md.hbs', repos);
  }

  async publish(repos: ScoredRepository[]): Promise<string> {
    const content = this.render(repos);
    const client = new ButtondownClient(process.env.BUTTONDOWN_API_KEY);
    const result = await client.sendEmail({
      subject: this.subject(),
      body: content,
      email_type: 'public',
    });

    return result.id;
  }
}
