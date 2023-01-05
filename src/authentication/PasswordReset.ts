import { NextFunction, Request, Response } from 'express';
import AppException from '../exceptions/AppException';
import EmailService from '../services/Email.service';
import TokenMustStillBeValid from './rules/TokenMustStillBeValid';
import moment from 'moment';
import EncryptionService from '../services/Encryption.service';
import prisma from '../database/model.module';
import { User } from '@prisma/client';
import UserService from '../services/User.service';
import httpStatus from 'http-status';
import HelperClass from '../utils/helper';

export default class PasswordReset {
  constructor(
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
    private readonly userService: UserService,
  ) {}

  async sendResetPasswordEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { email } = req.body;
      const userExists: User = await this.userService.getUserByEmail(email);
      if (!userExists)
        return next(
          new AppException('Oops! User does not exist', httpStatus.NOT_FOUND),
        );

      const token = HelperClass.generateRandomChar(6, 'num');
      const hashedToken = await this.encryptionService.hashPassword(token);

      const updateBody: any = {
        password_reset_token: hashedToken,
        password_reset_token_expires_at: moment()
          .add(12, 'hours')
          .utc()
          .toDate(),
      };

      await this.userService.updateUserById(userExists.id, updateBody);

      await this.emailService._sendUserPasswordResetInstructionEmail(
        userExists.fullName,
        userExists.email,
        token,
      );

      res.status(httpStatus.NO_CONTENT).send();
    } catch (err: any) {
      return next(new AppException(err.message, err.status));
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const hashedToken = await this.encryptionService.hashString(
        req.body.token,
      );

      const user: User = await prisma.user.findFirst({
        where: { password_reset_token: hashedToken },
      });

      if (!user) return TokenMustStillBeValid(next);
      if (user.password_reset_token_expires_at < moment().utc().toDate())
        throw new Error(`Oops!, your token has expired`);
      const hashedPassword = await this.encryptionService.hashPassword(
        req.body.password,
      );

      const updateBody: any = {
        password: hashedPassword,
        password_reset_token: null,
        password_reset_token_expires_at: null,
      };

      await this.userService.updateUserById(user.id, updateBody);

      res.status(httpStatus.OK).json({
        status: 'success',
        message: 'Password reset was successful',
      });
    } catch (err: any) {
      return next(new AppException(err.message, err.status));
    }
  }
}
