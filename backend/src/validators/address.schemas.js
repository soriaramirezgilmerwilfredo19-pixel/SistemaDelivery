const { z } = require('zod');

const addressSchema = z.object({
  label: z.string().min(1).max(60).default('Casa'),
  line1: z.string().min(3, 'La direccion es muy corta').max(180),
  line2: z.string().max(180).optional().or(z.literal('')),
  city: z.string().min(2).max(80),
  postal_code: z.string().max(20).optional().or(z.literal('')),
  notes: z.string().max(255).optional().or(z.literal('')),
  is_default: z.boolean().optional().default(false)
});

module.exports = { addressSchema };
