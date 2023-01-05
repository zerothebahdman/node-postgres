/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import { TokenMustStillBeValid } from './rules/rules.module';
import AppException from '../exceptions/AppException';
import moment from 'moment';
import prisma from '../database/model.module';
import UserService from '../services/User.service';
import { User } from '@prisma/client';
import httpStatus from 'http-status';
import EncryptionService from '../services/Encryption.service';

export default class VerifyUserEmail {
  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
  ) {}
  async execute(req: Request, res: Response, next: NextFunction) {
    try {
      /**
       * Check if the hashed token sent to the user has not being tampered with
       * Check if the token is the same with the one stores in the database
       * check if the email has not being verified
       * check if the token has expired
       * set email_verification_token and email_verification_token_expiry field to null
       */

      const _hashedEmailToken: string = await this.encryptionService.hashString(
        req.body.otp,
      );

      const user: User = await prisma.user.findFirst({
        where: {
          is_email_verified: false,
          email_verification_token: _hashedEmailToken,
        },
      });

      if (!user) return TokenMustStillBeValid(next);
      if (user.email_verification_token_expiry < moment().utc().toDate())
        throw new Error(`Oops!, your token has expired`);

      const data: any = {
        is_email_verified: true,
        email_verified_at: moment().utc().toDate(),
        email_verification_token: null,
        email_verification_token_expiry: null,
      };
      await this.userService.updateUserById(user.id, data);

      return res.status(httpStatus.OK).json({
        status: `success`,
        message: `Your email: ${user.email} has been verified`,
      });
    } catch (err: any) {
      return next(
        new AppException(err.message, err.status || httpStatus.BAD_REQUEST),
      );
    }
  }
}
