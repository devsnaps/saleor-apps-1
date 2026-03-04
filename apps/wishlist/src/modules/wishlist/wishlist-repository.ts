import type { WishlistFilter, WishlistItem } from "./wishlist-item";

export interface WishlistRepository {
  add(item: WishlistItem): Promise<WishlistItem>;
  list(filter: WishlistFilter): Promise<WishlistItem[]>;
  remove(item: WishlistItem): Promise<boolean>;
}
