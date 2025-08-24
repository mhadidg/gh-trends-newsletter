import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Handlebars from 'handlebars';
import { ScoredRepository } from '../types/repository';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

Handlebars.registerHelper('formatNumber', (num: number) => num.toLocaleString());
Handlebars.registerHelper('truncate', (str: string, len: number) => {
  if (str.length <= len) return str;
  if (str[len - 1] === ' ') len -= 1; // trailing space
  return str.slice(0, len) + '…';
});

// TODO: fix HTML entities are not decoded (e.g., &amp;)
export function render(templateName: string, repos: ScoredRepository[]): string {
  const absolutePath = join(__dirname, `../templates/${templateName}`);
  const templateSource = readFileSync(absolutePath, 'utf-8');
  const template = Handlebars.compile(templateSource);

  const now = new Date();
  const date = now.toISOString().split('T')[0];

  return template({ repos, date });
}
