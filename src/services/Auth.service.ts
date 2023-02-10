import EncryptionService from './Encryption.service';
import TokenService from './Token.service';
import prisma from '../database/model.module';
import { User } from '@prisma/client';
import HelperClass from '../utils/helper';
import { createHash } from 'node:crypto';
import moment from 'moment';
import UserService from './User.service';
import EmailService from './Email.service';
import { JwtPayload } from 'jsonwebtoken';

export default class AuthService {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
  ) {}

  async createUser(
    createBody: User,
  ): Promise<{ user: User; OTP_CODE: string }> {
    createBody.password = await this.encryptionService.hashPassword(
      createBody.password,
    );
    const OTP_CODE = HelperClass.generateRandomChar(6, 'num');
    const hashedToken = createHash('sha512')
      .update(String(OTP_CODE))
      .digest('hex');

    createBody.email_verification_token = hashedToken;
    createBody.email_verification_token_expiry = moment()
      .add('6', 'hours')
      .utc()
      .toDate();

    const user: User = await prisma.user.create({ data: { ...createBody } });
    return { user, OTP_CODE };
  }

  async loginUser(loginPayload: User) {
    const token = await this.tokenService.generateToken(
      loginPayload.id,
      loginPayload.fullName,
    );

    return token;
  }

  async regenerateAccessToken(refreshToken: string): Promise<string> {
    const decodeToken = await new TokenService().verifyToken(refreshToken);
    const { sub }: string | JwtPayload = decodeToken;
    const user = await prisma.user.findUnique({ where: { id: sub as string } });

    if (!user) throw new Error(`Oops!, user with id ${sub} does not exist`);

    const { accessToken } = await this.tokenService.generateToken(
      user.id,
      user.email,
    );

    return accessToken;
  }

  async resendOtp(actor: User): Promise<void> {
    const otp = HelperClass.generateRandomChar(6, 'num');
    const hashedToken = await this.encryptionService.hashString(otp);

    const updateBody: Pick<
      User,
      'email_verification_token' | 'email_verification_token_expiry'
    > = {
      email_verification_token: hashedToken,
      email_verification_token_expiry: moment()
        .add('6', 'hours')
        .utc()
        .toDate(),
    };
    await this.userService.updateUserById(actor.id, updateBody);

    await this.emailService._sendUserEmailVerificationEmail(
      actor.fullName,
      actor.email,
      otp,
    );
  }
}
