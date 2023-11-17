import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateUserValidator,
  LoginValidator,
  RegenerateAccessToken,
  ResetPasswordValidator,
  verifyUserEmailValidator,
} from '../../../validators/Auth.validation';
import validate from '../../middlewares/validate';
import { resendOtpValidator } from '../../../validators/Auth.validation';
import { authController } from '../../controllers/controllers.module';

const route = Router();

route.post('/create-user', validate(CreateUserValidator), (req, res, next) => {
  authController.create(req, res, next);
});

route.post(
  '/verify-email',
  validate(verifyUserEmailValidator),
  (req, res, next) => {
    authController.verifyEmail(req, res, next);
  },
);

route.post('/login', validate(LoginValidator), (req, res, next) => {
  authController.login(req, res, next);
});

// TODO: implement logout endpoint
// route.get('/logout', (req, res, next) => {});

route.post(
  '/regenerate-access-token',
  validate(RegenerateAccessToken),
  (req, res, next) => {
    authController.regenerateAccessToken(req, res, next);
  },
);

route.post('/resend-otp', validate(resendOtpValidator), (req, res, next) => {
  authController.resendOtp(req, res, next);
});

route.post(
  '/reset-password',
  validate(ResetPasswordValidator),
  (req: Request, res: Response, next: NextFunction) => {
    authController.resetPassword(req, res, next);
  },
);

export default route;
