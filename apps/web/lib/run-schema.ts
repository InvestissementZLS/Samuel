import { z } from 'zod';

export const ClientSchema = z.object({
  name: z.string().default('Client Inconnu'),
  phone: z.string().nullable().optional(),
});

export const PropertySchema = z.object({
  address: z.string().default('Adresse Inconnue'),
  client: ClientSchema.optional().nullable(),
});

export const DailyRunJobSchema = z.object({
  id: z.string(),
  scheduledAt: z.string().or(z.date()),
  status: z.string().default('PENDING'),
  description: z.string().nullable().optional(),
  isDeleted: z.boolean().default(false),
  property: PropertySchema.optional().nullable(),
});

export const DailyRunPayloadSchema = z.array(DailyRunJobSchema);

// Inferred Types
export type DailyRunJob = z.infer<typeof DailyRunJobSchema>;
export type DailyRunPayload = z.infer<typeof DailyRunPayloadSchema>;
