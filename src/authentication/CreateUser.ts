import { Request, Response, NextFunction } from 'express';
import AppException from '../exceptions/AppException';
import EmailService from '../services/Email.service';
import httpStatus from 'http-status';
import prisma from '../database/model.module';
import AuthService from '../services/Auth.service';
import RESERVED_NAMES from '../utils/reservedNames';
import HelperClass from '../utils/helper';
const emailService = new EmailService();

export default class CreateUser {
  constructor(private readonly authService: AuthService) {}

  async createUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response<any, Record<string, any>>> {
    try {
      const emailTaken = await prisma.user.findUnique({
        where: { email: req.body.email },
      });
      const userNameTaken = await prisma.user.findUnique({
        where: { username: req.body.username },
      });
      delete req.body.confirmPassword;
      if (emailTaken) throw new Error(`Oops!, ${emailTaken.email} is taken`);
      if (userNameTaken)
        throw new Error(`Oops!, ${userNameTaken.username} is taken`);

      // check that the username is in the right format
      HelperClass.userNameValidator(req.body.username);

      // Reserved usernames
      if (RESERVED_NAMES.includes(req.body.username))
        throw new Error('Username unavailable, please choose another username');

      req.body.referalCode = HelperClass.generateRandomChar(6, 'upper-num');

      /** if user does not exist create the user using the user service */
      const { user, OTP_CODE } = await this.authService.createUser(req.body);

      /** Send email verification to user */
      await emailService._sendUserEmailVerificationEmail(
        user.fullName,
        user.email,
        OTP_CODE
      );

      return res.status(httpStatus.OK).json({
        status: 'success',
        message: `We've sent an verification email to your mail`,
        user,
      });
    } catch (err: any) {
      return next(
        new AppException(err.message, err.status || httpStatus.BAD_REQUEST)
      );
    }
  }
}
