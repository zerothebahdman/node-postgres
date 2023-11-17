import { NextFunction, Request, Response } from 'express';
import prisma from '../../database/model.module';
import HelperClass from '../../utils/helper';
import EmailService from '../../services/email.service';
import AuthService from '../../services/auth.service';
import httpStatus from 'http-status';
import AppException from '../../exceptions/appException';
import UserService from '../../services/user.service';
import EncryptionService from '../../services/encryption.service';
import {
  AccountStatus,
  VerificationStatus,
  VerificationType,
} from '@prisma/client';
import moment from 'moment';

export default class UserAuth {
  constructor(
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const emailTaken = await prisma.user_accounts.findUnique({
        where: { email: req.body.email },
      });
      const userNameTaken = await prisma.user_accounts.findUnique({
        where: { username: req.body.username },
      });
      delete req.body.confirmPassword;
      if (emailTaken) throw new Error(`Oops!, ${emailTaken.email} is taken`);
      if (userNameTaken)
        throw new Error(`Oops!, ${userNameTaken.username} is taken`);

      req.body.referalCode = HelperClass.generateRandomChar(6, 'upper-num');
      const otp = HelperClass.generateRandomChar(6, 'num');

      /** if user does not exist create the user using the user service */
      const user = await this.authService.createUser(req.body, otp);

      /** Send email verification to user */
      await this.emailService._sendUserEmailVerificationEmail(
        user.full_name,
        user.email,
        otp,
      );

      return res.status(httpStatus.OK).json({
        status: 'success',
        message: `We've sent an verification email to your mail`,
        user,
      });
    } catch (err: unknown) {
      if (err instanceof Error)
        return next(new AppException(err.message, httpStatus.BAD_REQUEST));
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const userExists = await this.userService.getUserByEmail(req.body.email);

      if (
        !userExists ||
        !(await this.encryptionService.comparePassword(
          userExists.password,
          req.body.password,
        ))
      )
        throw new Error(`Oops!, invalid email or password`);

      if (userExists.verification !== VerificationStatus.verified)
        next(
          new AppException(
            'Oops! email address is not verified',
            httpStatus.FORBIDDEN,
          ),
        );

      if (userExists.status !== AccountStatus.active)
        next(
          new AppException(
            'Oops! your account has been deactivated, please contact support',
            httpStatus.FORBIDDEN,
          ),
        );
      const token = await this.authService.loginUser(userExists);

      return res.status(httpStatus.ACCEPTED).json({
        user: HelperClass.removeUnwantedProperties(userExists, ['password']),
        token,
      });
    } catch (err: unknown) {
      if (err instanceof Error)
        return next(new AppException(err.message, httpStatus.BAD_REQUEST));
    }
  }

  async regenerateAccessToken(req: Request, res: Response, next: NextFunction) {
    try {
      const accessToken = await this.authService.regenerateAccessToken(
        req.body.refreshToken,
      );
      if (!accessToken || accessToken.trim() === '')
        return next(
          new AppException(
            'Oops! Refresh token expired.',
            httpStatus.FORBIDDEN,
          ),
        );

      return res.status(httpStatus.OK).json({ status: 'success', accessToken });
    } catch (err: unknown) {
      if (err instanceof Error)
        return next(new AppException(err.message, httpStatus.BAD_REQUEST));
    }
  }

  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, email } = req.query;
      const user = await this.userService.getUserByEmail(email as string);
      if (!user) throw new Error('Oops!, user does not exists');
      if (user.verification === VerificationStatus.verified)
        throw new Error(`Oops!, email has already been verified`);

      const token = HelperClass.generateRandomChar(6, 'num');
      const hashToken = await this.encryptionService.hashString(token);
      await this.authService.resendVerificationMail(
        user.id,
        hashToken,
        VerificationType[type as keyof typeof VerificationType],
      );
      type === VerificationType.email_verification
        ? await this.emailService._sendUserEmailVerificationEmail(
            user.full_name,
            user.email,
            token,
          )
        : null;
      return res.status(httpStatus.NO_CONTENT).send();
    } catch (err: unknown) {
      if (err instanceof Error)
        return next(new AppException(err.message, httpStatus.BAD_REQUEST));
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const hashedToken = await this.encryptionService.hashString(
        req.body.token,
      );

      const verification = await this.authService.queryVerification({
        token: hashedToken,
        type: 'password_reset',
      });
      if (!verification) throw new Error('Oops!, invalid token provided');

      if (!verification) throw new Error(`Oops!, user does not exist`);
      if (verification.valid_until < moment().utc().toDate())
        throw new Error(`Oops!, your token has expired`);
      const user = await this.userService.getUserById(
        verification.user_account_id,
      );
      const hashedPassword = await this.encryptionService.hashPassword(
        req.body.password,
      );

      const updateBody = {
        password: hashedPassword,
      };

      await this.userService.updateUserById(user.id, updateBody);

      res.status(httpStatus.OK).json({
        status: 'success',
        message: 'Password reset was successful',
      });
    } catch (err: unknown) {
      if (err instanceof Error)
        return next(new AppException(err.message, httpStatus.BAD_REQUEST));
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      /**
       * Check if the hashed token sent to the user has not being tampered with
       * Check if the token is the same with the one stores in the database
       * check if the email has not being verified
       * check if the token has expired
       * set email_verification_token and email_verification_token_expiry field to null
       */

      const hashedToken: string = await this.encryptionService.hashString(
        req.body.otp,
      );

      const user = await prisma.user_accounts.findFirst({
        where: {
          verification: VerificationStatus.unverified,
        },
      });

      if (!user) throw new Error('Oops!, user not found');
      const verification = await this.authService.queryVerification({
        token: hashedToken,
        type: 'email_verification',
      });
      if (!verification) throw new Error('Oops!, invalid token provided');

      if (!verification) throw new Error(`Oops!, user does not exist`);
      if (verification.valid_until < moment().utc().toDate())
        throw new Error(`Oops!, your token has expired`);

      await this.userService.updateUserById(user.id, {
        verification: VerificationStatus.verified,
        status: AccountStatus.active,
      });

      return res.status(httpStatus.OK).json({
        status: `success`,
        message: `Your email: ${user.email} has been verified`,
      });
    } catch (err: unknown) {
      if (err instanceof Error)
        return next(new AppException(err.message, httpStatus.BAD_REQUEST));
    }
  }
}
