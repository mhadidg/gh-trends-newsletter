import { weekNumber } from '../utils/common';
import { ScoredRepository } from './repository';

export abstract class Publisher {
  abstract readonly name: string;
  abstract enabled(): boolean;
  render?(repos: ScoredRepository[]): string;
  abstract publish(repos: ScoredRepository[]): Promise<string>;

  subject(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = weekNumber(now);
    return `GitHub Trends — ${year}-W${week.toString().padStart(2, '0')}`;
  }
}
