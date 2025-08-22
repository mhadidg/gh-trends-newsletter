import { HttpError, logError, logHttpError, TaggedError } from './logging';

export function weekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export function hoursSince(date: string): number {
  const created = new Date(date);
  const now = new Date();
  const diff = now.getTime() - created.getTime();
  return diff / (1000 * 60 * 60);
}

export function capitalize(str: string): string {
  return str ? str[0]!.toUpperCase() + str.slice(1) : '';
}

export async function handleProcessError(error: unknown) {
  if (error instanceof HttpError) {
    await logHttpError(error.tag, error);
  } else if (error instanceof TaggedError) {
    logError(error.tag, error);
  } else {
    console.log('');
    console.log('🫣 Unhandled error');
    throw error;
  }
}
