const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  email: z.string().email('Email invalido').max(160),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres').max(72),
  phone: z.string().max(30).optional().or(z.literal(''))
});

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La contrasena es obligatoria')
});

module.exports = { registerSchema, loginSchema };
