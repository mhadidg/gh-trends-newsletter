import { z } from 'zod';

export const RepositorySchema = z.object({
  id: z.string(),
  nameWithOwner: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  primaryLanguage: z.object({ name: z.string() }).nullable(),
  createdAt: z.string(),
  stargazerCount: z.number(),
});

export const ScoredRepositorySchema = RepositorySchema.extend({
  score: z.number(),
});

export const NewsletterSchema = z.object({
  subject: z.string(),
  content: z.string(),
});

export type Repository = z.infer<typeof RepositorySchema>;
export type ScoredRepository = z.infer<typeof ScoredRepositorySchema>;
export type Newsletter = z.infer<typeof NewsletterSchema>;
