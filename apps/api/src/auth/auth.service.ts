import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { access } from 'node:fs/promises';
import { prisma } from '@repo/database';

import type { UserRecord } from './auth.types';
import type { JwtAccessPayload } from '../common/types/auth.types';
import { UserRepository } from './repositories';
import type { SignupDto } from './dto/signup.dto';
import type { LoginDto } from './dto/login.dto';

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token: string;
};

type GoogleUserInfoResponse = {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
};

type OAuthState = {
  state: string;
  codeVerifier: string;
  createdAt: number;
};

const TEST_USER_ID = 'dummy_user_001';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_SQL_RELATIVE_PATH = path.join(
  'packages',
  'database',
  'prisma',
  'scripts',
  'add_test_user.sql',
);

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private redis!: Redis;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url');

    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err.message);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });
  }

  async onModuleDestroy() {
    this.logger.log('Closing Redis connection...');
    await this.redis.quit();
  }

  private generateRandomString(bytes: number) {
    return crypto.randomBytes(bytes).toString('base64url');
  }

  private getCodeChallenge(verifier: string) {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return Buffer.from(hash).toString('base64url').replace(/=/g, '');
  }

  private getOAuthStateKey(oauthStateId: string) {
    return `oauth:state:${oauthStateId}`;
  }

  private async saveOAuthState(oauthStateId: string, state: OAuthState) {
    try {
      const oauthTtlMs = 5 * 60 * 1000; // 5 minutes
      await this.redis.set(
        this.getOAuthStateKey(oauthStateId),
        JSON.stringify(state),
        'PX',
        oauthTtlMs,
      );
    } catch (error) {
      this.logger.error('Failed to save OAuth state to Redis', error);
      throw new InternalServerErrorException(
        'Unable to process authentication request',
      );
    }
  }

  private async loadOAuthState(oauthStateId: string) {
    try {
      const raw = await this.redis.get(this.getOAuthStateKey(oauthStateId));
      if (!raw) return null;
      return JSON.parse(raw) as OAuthState;
    } catch (error) {
      this.logger.error('Failed to load OAuth state from Redis', error);
      throw new InternalServerErrorException(
        'Unable to validate authentication state',
      );
    }
  }

  private async deleteOAuthState(oauthStateId: string) {
    await this.redis.del(this.getOAuthStateKey(oauthStateId));
  }

  async startGoogleOAuth() {
    const googleClientId = this.configService.get<string>('google.clientId');
    const googleRedirectUri =
      this.configService.get<string>('google.redirectUri');

    const state = this.generateRandomString(16);
    const pkceVerifier = this.generateRandomString(32);
    const pkceChallenge = this.getCodeChallenge(pkceVerifier);
    const oauthStateId = crypto.randomUUID();

    const oauthState: OAuthState = {
      state,
      codeVerifier: pkceVerifier,
      createdAt: Date.now(),
    };

    await this.saveOAuthState(oauthStateId, oauthState);

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', googleClientId);
    url.searchParams.set('redirect_uri', googleRedirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', pkceChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');

    return {
      authUrl: url.toString(),
      oauthStateId,
    };
  }

  async handleGoogleCallback(
    code: string,
    state: string,
    oauthStateId: string,
  ) {
    const oauthState = await this.loadOAuthState(oauthStateId);
    if (!oauthState || oauthState.state !== state) {
      throw new BadRequestException('Invalid or expired session');
    }

    await this.deleteOAuthState(oauthStateId);

    const googleClientId = this.configService.get<string>('google.clientId');
    const googleClientSecret = this.configService.get<string>(
      'google.clientSecret',
    );
    const googleRedirectUri =
      this.configService.get<string>('google.redirectUri');

    let tokenData: GoogleTokenResponse;
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: googleRedirectUri,
          grant_type: 'authorization_code',
          code_verifier: oauthState.codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
      }
      tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    } catch (error) {
      this.logger.error('Google token exchange failed', error);
      throw new InternalServerErrorException('Authentication failed');
    }

    let userInfo: GoogleUserInfoResponse;
    try {
      const userResponse = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        },
      );

      if (!userResponse.ok) {
        throw new Error(`Userinfo fetch failed: ${userResponse.statusText}`);
      }
      userInfo = (await userResponse.json()) as GoogleUserInfoResponse;
    } catch (error) {
      this.logger.error('Google user info fetch failed', error);
      throw new InternalServerErrorException('Failed to fetch user profile');
    }

    if (!userInfo.email_verified) {
      throw new BadRequestException(
        'Google account email is not verified. Please verify your Google email before signing in.',
      );
    }

    let user = await this.userRepository.findByGoogleId(userInfo.sub);
    const userData = {
      googleId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    };

    if (!user) {
      user = await this.userRepository.createGoogleUser(userData);
      this.logger.log(`New Google user registered: ${user.id}`);
    } else {
      user = await this.userRepository.update(user.id, userData);
      this.logger.log(`Existing Google user logged in: ${user.id}`);
    }

    const internalUser: UserRecord = {
      id: user.id,
      googleId: user.googleId ?? null,
      email: user.email,
      name: user.name,
      picture: user.picture,
      provider: user.provider as 'GOOGLE' | 'EMAIL',
      createdAt: user.createdAt.getTime(),
    };

    const token = this.issueInternalJwt(internalUser);

    return {
      status: 'SUCCESS',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  async signup(dto: SignupDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.userRepository.createEmailUser({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
    });

    this.logger.log(`New email user registered: ${user.id}`);

    const internalUser: UserRecord = {
      id: user.id,
      googleId: null,
      email: user.email,
      name: user.name,
      picture: user.picture,
      provider: 'EMAIL',
      createdAt: user.createdAt.getTime(),
    };

    const token = this.issueInternalJwt(internalUser);

    return {
      status: 'SUCCESS',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  async emailLogin(dto: LoginDto) {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.provider !== 'EMAIL') {
      throw new BadRequestException(
        'This account uses Google login. Please sign in with Google.',
      );
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log(`Email user logged in: ${user.id}`);

    const internalUser: UserRecord = {
      id: user.id,
      googleId: null,
      email: user.email,
      name: user.name,
      picture: user.picture,
      provider: 'EMAIL',
      createdAt: user.createdAt.getTime(),
    };

    const token = this.issueInternalJwt(internalUser);

    return {
      status: 'SUCCESS',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  async testLogin() {
    this.logger.log(`Test login requested for userId=${TEST_USER_ID}`);
    let user = await this.userRepository.findById(TEST_USER_ID);
    let seeded = false;

    if (!user) {
      this.logger.log(
        `Test user ${TEST_USER_ID} not found, starting seed from SQL script`,
      );
      const existingTestEmailUser =
        await this.userRepository.findByEmail(TEST_USER_EMAIL);

      if (existingTestEmailUser && existingTestEmailUser.id !== TEST_USER_ID) {
        this.logger.warn(
          `Test seed blocked: email ${TEST_USER_EMAIL} belongs to userId=${existingTestEmailUser.id}`,
        );
        throw new ConflictException(
          `Test email ${TEST_USER_EMAIL} already exists with another account`,
        );
      }

      await this.seedTestUserData();
      seeded = true;
      user = await this.userRepository.findById(TEST_USER_ID);
    } else {
      this.logger.log(`Test user already exists: userId=${TEST_USER_ID}`);
    }

    if (!user) {
      this.logger.error(
        `Test login failed: user ${TEST_USER_ID} missing after seed`,
      );
      throw new InternalServerErrorException(
        'Failed to prepare test user data',
      );
    }

    const internalUser: UserRecord = {
      id: user.id,
      googleId: user.googleId ?? null,
      email: user.email,
      name: user.name,
      picture: user.picture,
      provider: user.provider as 'GOOGLE' | 'EMAIL',
      createdAt: user.createdAt.getTime(),
    };

    const token = this.issueInternalJwt(internalUser);

    return {
      status: 'SUCCESS',
      token,
      seeded,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  private async seedTestUserData() {
    const sqlFilePath = await this.resolveTestSqlFilePath();

    let sqlContent: string;
    try {
      sqlContent = await readFile(sqlFilePath, 'utf-8');
    } catch (error) {
      this.logger.error('Unable to read test user SQL script', error);
      throw new InternalServerErrorException('Test data script not found');
    }

    const preparedSql = sqlContent
      .replaceAll(":'user_id'", `'${TEST_USER_ID}'`)
      .split('-- Summary report')[0]
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n');

    const statements = preparedSql
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    try {
      this.logger.log(
        `Executing test seed SQL (${statements.length} statements)`,
      );
      for (const statement of statements) {
        await prisma.$executeRawUnsafe(statement);
      }
      this.logger.log(`Test user seed completed for userId=${TEST_USER_ID}`);
    } catch (error) {
      this.logger.error('Failed to seed test user data', error);
      throw new InternalServerErrorException('Failed to seed test user data');
    }
  }

  private async resolveTestSqlFilePath() {
    const searchedPaths: string[] = [];
    let currentDir = process.cwd();

    for (let depth = 0; depth < 8; depth += 1) {
      const candidate = path.join(currentDir, TEST_SQL_RELATIVE_PATH);
      searchedPaths.push(candidate);

      try {
        await access(candidate);
        this.logger.log(`Resolved test seed SQL path: ${candidate}`);
        return candidate;
      } catch {
        // Try parent directory
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }

    this.logger.error(
      `Test data script not found. Searched: ${searchedPaths.join(' | ')}`,
    );
    throw new InternalServerErrorException('Test data script not found');
  }

  private issueInternalJwt(user: UserRecord) {
    // Keep JWT small — never include picture or large fields.
    // The cookie has a 4 KB browser limit; a base64 image blows it instantly.
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      provider: user.provider,
    };

    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      provider: user.provider,
    };
  }

  async updateProfile(
    userId: string,
    data: { name?: string; picture?: string | null },
  ) {
    const updatedUser = await this.userRepository.update(userId, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.picture !== undefined ? { picture: data.picture } : {}),
    });
    if (!updatedUser) throw new BadRequestException('User not found');
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      picture: updatedUser.picture,
      provider: updatedUser.provider,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (user.provider !== 'EMAIL') {
      throw new BadRequestException(
        'Password change is not available for Google accounts',
      );
    }
    if (!user.password) {
      throw new BadRequestException('No password set for this account');
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepository.updatePassword(userId, hashed);
  }

  async getCurrentUser(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.userRepository.findById(payload.sub);
      if (!user) throw new BadRequestException('User not found');
      return user;
    } catch {
      throw new BadRequestException('Invalid token');
    }
  }
}
