import type { WishlistFilter, WishlistItem } from "./wishlist-item";
import type { WishlistRepository } from "./wishlist-repository";

const createKey = (item: WishlistItem) => `${item.channel}:${item.userId}:${item.productVariantId}`;

export class InMemoryWishlistRepository implements WishlistRepository {
  private storage = new Map<string, WishlistItem>();

  async add(item: WishlistItem): Promise<WishlistItem> {
    this.storage.set(createKey(item), item);

    return item;
  }

  async list(filter: WishlistFilter): Promise<WishlistItem[]> {
    return [...this.storage.values()].filter(
      (item) => item.channel === filter.channel && item.userId === filter.userId,
    );
  }

  async remove(item: WishlistItem): Promise<boolean> {
    return this.storage.delete(createKey(item));
  }
}
