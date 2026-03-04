import { z } from "zod";

export const wishlistItemSchema = z.object({
  channel: z.string().min(1),
  productVariantId: z.string().min(1),
  userId: z.string().min(1),
});

export const wishlistFilterSchema = z.object({
  channel: z.string().min(1),
  userId: z.string().min(1),
});

export type WishlistItem = z.infer<typeof wishlistItemSchema>;
export type WishlistFilter = z.infer<typeof wishlistFilterSchema>;
