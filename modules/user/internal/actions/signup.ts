import { ulid } from 'ulid';
import { emit } from '@/shared/events/bus';
import { userRepository } from '../data/user.repository';
import type { User } from '../domain/user.types';

export async function signupUser(input: { email: string; name: string }): Promise<User> {
  const user: User = {
    userId: ulid(),
    email: input.email,
    name: input.name,
  };

  await userRepository.create(user);

  emit('user.signup', {
    userId: user.userId,
    email: user.email,
  });

  return user;
}
