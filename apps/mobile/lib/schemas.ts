/**
 * ============================================================
 * SCHEMAS MIROIR MOBILE — Copie synchronisée de web/lib/schemas/mobile-api.ts
 * ============================================================
 * Ces schémas Zod doivent rester IDENTIQUES à ceux définis côté web.
 * Ils garantissent que l'app mobile et l'API parlent le même langage.
 *
 * RÈGLE: Si tu modifies ce fichier → mets à jour le miroir web aussi.
 * ============================================================
 */

import { z } from 'zod';

// ─── CLIENT ─────────────────────────────────────────────────

export const ClientSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  billingAddress: z.string().nullable().optional(),
  properties: z.array(z.object({
    id: z.string(),
    address: z.string(),
  })).optional(),
});

export const ClientSearchResponseSchema = z.array(ClientSearchResultSchema);

export const QuickCreateClientSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const QuickCreateClientResponseSchema = z.object({
  client: ClientSearchResultSchema,
  property: z.object({
    id: z.string(),
    address: z.string(),
  }).optional(),
});

// ─── QUICK ADD JOB ──────────────────────────────────────────

export const QuickAddJobSchema = z.object({
  technicianId: z.string(),
  clientId: z.string(),
  propertyId: z.string(),
  scheduledAt: z.string().datetime(),
  description: z.string().optional(),
});

export const QuickAddJobResponseSchema = z.object({
  job: z.object({
    id: z.string(),
    scheduledAt: z.string(),
    status: z.string(),
    description: z.string().nullable().optional(),
    property: z.object({
      address: z.string(),
      client: z.object({
        name: z.string(),
        phone: z.string().nullable().optional(),
      }),
    }),
  }),
});

// ─── INVENTORY ──────────────────────────────────────────────

export const InventoryItemSchema = z.object({
  id: z.string(),
  quantity: z.number(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    unit: z.string(),
  }),
});

export const InventoryResponseSchema = z.array(InventoryItemSchema);

export const AuditSubmissionItemSchema = z.object({
  productId: z.string(),
  actualQuantity: z.number().int().min(0),
  notes: z.string().optional(),
});

export const AuditSubmissionSchema = z.object({
  userId: z.string(),
  items: z.array(AuditSubmissionItemSchema),
});

// ─── TYPES INFÉRÉS ─────────────────────────────────────────

export type ClientSearchResult = z.infer<typeof ClientSearchResultSchema>;
export type QuickCreateClientInput = z.infer<typeof QuickCreateClientSchema>;
export type QuickAddJobInput = z.infer<typeof QuickAddJobSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type AuditSubmissionItem = z.infer<typeof AuditSubmissionItemSchema>;
