const { z } = require('zod');

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'La nota minima es 1').max(5, 'La nota maxima es 5'),
  comment: z.string().max(500).optional().or(z.literal(''))
});

module.exports = { reviewSchema };
