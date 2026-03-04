import { wishlistFilterSchema, wishlistItemSchema } from "./wishlist-item";
import type { WishlistRepository } from "./wishlist-repository";

export class WishlistService {
  private repository: WishlistRepository;

  constructor(repository: WishlistRepository) {
    this.repository = repository;
  }

  async add(input: unknown) {
    const item = wishlistItemSchema.parse(input);

    return this.repository.add(item);
  }

  async list(input: unknown) {
    const filter = wishlistFilterSchema.parse(input);

    return this.repository.list(filter);
  }

  async remove(input: unknown) {
    const item = wishlistItemSchema.parse(input);

    return this.repository.remove(item);
  }
}
