const { z } = require('zod');


const orderItem = z.object({
productId: z.string().nonempty(),
name: z.string().nonempty(),
price: z.number().nonnegative(),
quantity: z.number().int().positive()
});


const createOrderSchema = z.object({
customer: z.object({
name: z.string().min(1),
phone: z.string().min(1).optional(),
address: z.string().min(1).optional()
}).optional(),
items: z.array(orderItem).min(1),
total: z.number().nonnegative(),
notes: z.string().optional()
});


module.exports = { createOrderSchema };