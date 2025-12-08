const { z } = require("zod");

// Validate each item inside the order
const orderItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  qty: z.number().int().positive("Quantity must be a positive number"),
  price: z.number().nonnegative("Price must be 0 or higher")
});

// Validate the full order payload
const createOrderSchema = z.object({
  table: z.number().int().positive("Table number is required"),
  waiterId: z.string().optional(),  // The waiter device/user ID
  items: z.array(orderItemSchema).min(1, "Order must contain at least 1 item"),
  total: z.number().nonnegative("Total must be 0 or higher"),
  notes: z.string().optional()
});

// Export modules
module.exports = {
  createOrderSchema
};
