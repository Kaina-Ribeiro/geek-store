import type { CollectionConfig } from 'payload'

// Counters behind lib/rate-limit.ts (one row per action + visitor IP). Kept in
// Postgres so the limit holds across server instances. Not shown in the panel.
export const RateLimits: CollectionConfig = {
  slug: 'rate-limits',
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'hits', type: 'number', required: true, defaultValue: 0 },
    { name: 'resetAt', type: 'date', required: true, index: true },
  ],
}
