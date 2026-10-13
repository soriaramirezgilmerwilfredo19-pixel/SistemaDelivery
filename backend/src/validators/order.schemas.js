const { z } = require('zod');

const cartItemSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().max(50)
});

const cartItemUpdateSchema = z.object({
  quantity: z.coerce.number().int().positive().max(50)
});

const checkoutSchema = z.object({
  address_id: z.coerce.number().int().positive(),
  payment_method: z.enum(['cash', 'card']),
  notes: z.string().max(400).optional().or(z.literal(''))
});

const customOrderSchema = z.object({
  address_id: z.coerce.number().int().positive(),
  payment_method: z.enum(['cash', 'card']),
  dish_type: z.string().trim().min(1).max(30).default('otro'),
  custom_request: z.string().trim().min(5, 'Describe tu pedido personalizado').max(400),
  quantity: z.coerce.number().int().positive().max(20).default(1),
  budget: z.coerce.number().positive('Indica tu presupuesto estimado').max(99999),
  notes: z.string().max(400).optional().or(z.literal(''))
});

const orderStatusSchema = z.object({
  status: z.enum(['confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'])
});

const assignSchema = z.object({
  courier_id: z.coerce.number().int().positive()
});

const locationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
});

module.exports = { cartItemSchema, cartItemUpdateSchema, checkoutSchema, customOrderSchema, orderStatusSchema, assignSchema, locationSchema };
