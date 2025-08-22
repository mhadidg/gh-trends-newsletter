import { weekNumber } from '../utils/common';

export abstract class Publisher {
  abstract readonly name: string;
  abstract enabled(): boolean;
  abstract publish(content: string): Promise<string>;

  subject(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = weekNumber(now);
    return `GitHub Trends — ${year}-W${week.toString().padStart(2, '0')}`;
  }
}
