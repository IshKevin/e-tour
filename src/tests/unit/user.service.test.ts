// src/tests/unit/user.service.test.ts
import { userService } from '../../services/user.service';

describe('User Service', () => {
  it('should fetch all users', async () => {
    const users = await userService.getAllUsers();
    expect(users).toBeInstanceOf(Array);
  });
});