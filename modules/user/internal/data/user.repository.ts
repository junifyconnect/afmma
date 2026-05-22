import type { User, UserId } from '../domain/user.types';

const store = new Map<UserId, User>();

export const userRepository = {
  async create(user: User): Promise<User> {
    store.set(user.userId, user);
    return user;
  },

  async findById(userId: UserId): Promise<User | null> {
    return store.get(userId) ?? null;
  },
};
