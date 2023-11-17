import EncryptionService from './encryption.service';
import TokenService from './token.service';
import prisma from '../database/model.module';
import { VerificationType, user_accounts, verifications } from '@prisma/client';
import moment from 'moment';
import { JwtPayload } from 'jsonwebtoken';

export default class AuthService {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly tokenService: TokenService,
  ) {}

  async createUser(
    createBody: user_accounts,
    otp: string,
  ): Promise<user_accounts> {
    createBody.password = await this.encryptionService.hashPassword(
      createBody.password,
    );
    const hashedToken = await this.encryptionService.hashString(otp);
    const user = await prisma.user_accounts.create({
      data: {
        ...createBody,
        verifications: {
          create: {
            token: hashedToken,
            valid_until: moment().add('6', 'hours').utc().toDate(),
            type: 'email_verification',
          },
        },
      },
    });
    return user;
  }

  async loginUser(loginPayload: user_accounts) {
    const token = await this.tokenService.generateToken(
      loginPayload.id,
      loginPayload.full_name,
    );

    return token;
  }

  async regenerateAccessToken(refreshToken: string): Promise<string> {
    const decodeToken = await new TokenService().verifyToken(refreshToken);
    const { sub }: string | JwtPayload = decodeToken;
    const user = await prisma.user_accounts.findUnique({
      where: { id: sub as string },
    });

    if (!user) throw new Error(`Oops!, user with id ${sub} does not exist`);

    const { accessToken } = await this.tokenService.generateToken(
      user.id,
      user.email,
    );

    return accessToken;
  }

  async resendVerificationMail(
    user_id: string,
    token: string,
    type: VerificationType,
  ): Promise<void> {
    // delete old email verification tokens if exist
    const deletePrevEmailVerificationIfExist = prisma.verifications.deleteMany({
      where: { user_account_id: user_id, type },
    });

    const createEmailVerification = prisma.verifications.create({
      data: {
        user_account_id: user_id,
        token,
        valid_until: moment().add(1, 'days').toDate(),
        type,
      },
      select: null,
    });

    await prisma.$transaction([
      deletePrevEmailVerificationIfExist,
      createEmailVerification,
    ]);
  }

  async queryVerification(filter: Partial<verifications>) {
    const data = await prisma.verifications.findFirst({
      where: filter,
    });
    return data;
  }
}
