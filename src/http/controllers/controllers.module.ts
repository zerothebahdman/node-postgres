/**
 * Use this module file to create instances of all controllers and simplify imports in to your routers
 */

import UserController from './users.controller';
import AuthController from './auth.controller';
import EmailService from '../../services/email.service';
import EncryptionService from '../../services/encryption.service';
import UserService from '../../services/user.service';
import AuthService from '../../services/auth.service';
import TokenService from '../../services/token.service';

export const userController = new UserController();
export const authController = new AuthController(
  new EmailService(),
  new AuthService(new EncryptionService(), new TokenService()),
  new UserService(),
  new EncryptionService(),
);
