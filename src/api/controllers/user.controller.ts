import { Request, Response } from 'express';
import { userService } from '../../services/user.service';
import { successResponse } from '../../utils/response';

export const userController = {
  async getAllUsers(req: Request, res: Response) {
    const users = await userService.getAllUsers();
    return successResponse(res, 200, 'Users fetched successfully', users);
  },
  async createUser(req: Request, res: Response) {
    const user = await userService.createUser(req.body);
    return successResponse(res, 201, 'User created successfully', user);
  },
};