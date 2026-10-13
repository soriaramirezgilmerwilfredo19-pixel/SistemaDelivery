const { z } = require('zod');

const updateMeSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(30).optional().or(z.literal(''))
});

module.exports = { updateMeSchema };
