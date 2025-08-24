import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Handlebars from 'handlebars';
import { ScoredRepository } from '../types/repository';
import { weekNumber } from '../utils/common';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

Handlebars.registerHelper('formatNumber', (num: number) => num.toLocaleString());
Handlebars.registerHelper('truncate', (str: string, len: number) => {
  if (str.length <= len) return str;
  if (str[len - 1] === ' ') len -= 1;
  return str.slice(0, len) + '…';
});

// Load and compile template
const templatePath = join(__dirname, '../templates/release.md.hbs');
const templateSource = readFileSync(templatePath, 'utf-8');
const template = Handlebars.compile(templateSource);

// TODO: fix HTML entities are not decoded (e.g., &amp;)
export function render(repos: ScoredRepository[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const week = weekNumber(now);

  const templateData = {
    year,
    week: week.toString().padStart(2, '0'),
    date: now.toISOString().split('T')[0],
    repos,
  };

  return template(templateData);
}
