import { userRepository } from '../data/user.repository';
import type { User, UserId } from '../domain/user.types';

export async function findUserById(userId: UserId): Promise<User | null> {
  return userRepository.findById(userId);
}
