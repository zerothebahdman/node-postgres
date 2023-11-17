import prisma from '../database/model.module';
import { user_accounts } from '@prisma/client';
import paginate from '../utils/paginate';

export default class UserService {
  async getAllUsers(
    filter: Partial<user_accounts>,
    options: {
      orderBy?: string;
      page?: string;
      limit?: string;
      populate?: string;
    } = {},
    ignorePagination = false,
  ): Promise<
    | user_accounts[]
    | {
        results: typeof Object;
        page: number;
        limit: number;
        totalPages: number;
        total: number;
      }
  > {
    const data = ignorePagination
      ? await prisma.user_accounts.findMany()
      : await paginate<user_accounts, typeof prisma.user_accounts>(
          filter,
          options,
          prisma.user_accounts,
        );
    return data;
  }

  async getUser(filter: Partial<user_accounts>): Promise<user_accounts> {
    const data = await prisma.user_accounts.findFirst({ where: filter });
    return data;
  }

  async getUserById(
    id: string,
    eagerLoad?: { include: { [key: string]: boolean } },
  ): Promise<user_accounts> {
    const data = eagerLoad
      ? await prisma.user_accounts.findUnique({ where: { id } })
      : await prisma.user_accounts.findUnique({ where: { id }, ...eagerLoad });
    if (!data) new Error(`User with id: ${id} does not exist`);
    return data;
  }

  async updateUserById(
    id: string,
    updateBody: Partial<user_accounts>,
  ): Promise<user_accounts> {
    const data = await prisma.user_accounts.update({
      where: { id },
      data: updateBody,
    });
    return data;
  }

  async deleteUserById(id: string): Promise<user_accounts> {
    const data = await prisma.user_accounts.delete({ where: { id } });
    return data;
  }

  async getUserByEmail(email: string): Promise<user_accounts> {
    const data = await prisma.user_accounts.findUnique({ where: { email } });
    return data;
  }
}
