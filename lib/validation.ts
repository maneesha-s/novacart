import { z } from "zod";
export const ResourceId = z.string().uuid();
export const AddressSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  addressLine: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(4).max(12).regex(/^[a-zA-Z0-9 -]+$/),
  phone: z.string().trim().min(8).max(20).regex(/^\+?[0-9 ()-]+$/),
});
export const CheckoutSchema = AddressSchema.extend({
  saveAddress: z.boolean(),
  items: z.array(z.object({ id: ResourceId, quantity: z.number().int().positive().max(100000) })).min(1).max(100)
    .refine(items => new Set(items.map(item => item.id)).size === items.length, "Duplicate cart products are not allowed."),
});
export const LoginSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(8).max(72).refine(value => new TextEncoder().encode(value).length <= 72, "Password must fit within 72 bytes") });
export const SignupSchema = LoginSchema.extend({ name: z.string().trim().min(2).max(100) });
