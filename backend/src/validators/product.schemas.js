const { z } = require('zod');

const productSchema = z.object({
  name: z.string().min(2).max(140),
  description: z.string().max(400).optional().or(z.literal('')),
  price: z.coerce.number().positive('El precio debe ser mayor a 0'),
  discount: z.coerce.number().min(0).max(90).optional().default(0),
  badge: z.string().max(24).optional().or(z.literal('')),
  featured: z.boolean().optional().default(false),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  image_url: z
    .string()
    .max(6000)
    .refine((v) => !v || v.startsWith('http') || v.startsWith('data:image/'), {
      message: 'Debe ser una URL valida o una imagen SVG de la aplicacion'
    })
    .optional(),
  available: z.boolean().optional().default(true),
  stock: z.coerce.number().int().min(0).nullable().optional()
});

module.exports = { productSchema };