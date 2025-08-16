import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Handlebars from 'handlebars';
import { ScoredRepository, Newsletter } from '../utils/types';
import { getWeekNumber } from '../utils/common';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

Handlebars.registerHelper('add', (a: number, b: number) => a + b);
Handlebars.registerHelper('formatNumber', (num: number) => num.toLocaleString());

// Load and compile template
const templatePath = join(__dirname, '../templates/newsletter.hbs');
const templateSource = readFileSync(templatePath, 'utf-8');
const template = Handlebars.compile(templateSource);

export function render(repos: ScoredRepository[]): Newsletter {
  const now = new Date();
  const year = now.getFullYear();
  const week = getWeekNumber(now);
  const subject = `GitHub Trends — ${year}-W${week.toString().padStart(2, '0')}`;

  const templateData = {
    year,
    week: week.toString().padStart(2, '0'),
    date: now.toISOString().split('T')[0],
    repos,
  };

  const content = template(templateData);

  return {
    subject,
    content,
  };
}
