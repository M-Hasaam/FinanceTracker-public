import {
  Controller,
  Post,
  Patch,
  Get,
  Query,
  Res,
  Req,
  Body,
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/auth.types';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignupDto, @Res() res: Response) {
    const isProduction = this.configService.get<string>('env') === 'production';
    const result = await this.authService.signup(dto);

    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.status(HttpStatus.CREATED).json({
      status: 'SUCCESS',
      user: result.user,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const isProduction = this.configService.get<string>('env') === 'production';
    const result = await this.authService.emailLogin(dto);

    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.status(HttpStatus.OK).json({
      status: 'SUCCESS',
      user: result.user,
    });
  }

  @Post('test-login')
  @HttpCode(HttpStatus.OK)
  async testLogin(@Req() req: Request, @Res() res: Response) {
    const isProduction = this.configService.get<string>('env') === 'production';

    if (isProduction) {
      // Test login must never be reachable in production — it bypasses all auth.
      throw new BadRequestException('Not available in this environment');
    }

    const requestId =
      typeof (req as any).requestId === 'string'
        ? (req as any).requestId
        : 'n/a';
    this.logger.log(
      `[${requestId}] Test login started for userId=dummy_user_001`,
    );
    const result = await this.authService.testLogin();

    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    this.logger.log(
      `[${requestId}] Test login success for userId=${result.user.id} seeded=${result.seeded}`,
    );

    return res.status(HttpStatus.OK).json({
      status: 'SUCCESS',
      seeded: result.seeded,
      user: result.user,
    });
  }

  @Post('google/start')
  @HttpCode(HttpStatus.OK)
  async startGoogleOAuth(@Res() res: Response) {
    const result = await this.authService.startGoogleOAuth();

    const isProduction = this.configService.get<string>('env') === 'production';

    res.cookie('oauth_state_id', result.oauthStateId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutes
      path: '/',
    });

    return res.json({
      authUrl: result.authUrl,
    });
  }

  @Get('google/callback')
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing required parameters');
    }

    const oauthStateId = req.cookies.oauth_state_id;
    if (!oauthStateId || typeof oauthStateId !== 'string') {
      throw new BadRequestException('Invalid authentication session');
    }

    const isProduction = this.configService.get<string>('env') === 'production';
    const corsOrigin = this.configService.get<string>('cors.origin');

    try {
      const result = await this.authService.handleGoogleCallback(
        code,
        state,
        oauthStateId,
      );

      res.clearCookie('oauth_state_id', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
      });

      if (result.status === 'SUCCESS') {
        res.cookie('auth_token', result.token, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        });

        const nonce = randomBytes(16).toString('base64');
        res.setHeader('Content-Security-Policy', `script-src 'nonce-${nonce}'`);
        res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Authentication Successful</title>
              <meta charset="utf-8">
            </head>
            <body>
              <p>Authentication successful. Closing window...</p>
              <script nonce="${nonce}">
                if (window.opener) {
                  window.opener.postMessage(
                    { type: 'OAUTH_RESULT', status: 'SUCCESS' },
                    '${corsOrigin}'
                  );
                  setTimeout(function() { window.close(); }, 100);
                } else {
                  document.body.innerHTML = '<p>Authentication successful. Please close this window.</p>';
                }
              </script>
            </body>
          </html>
        `;
        return res.setHeader('Content-Type', 'text/html').send(html);
      }
    } catch (err) {
      this.clearCookiesOnFailure(res, isProduction);
      const isDev = !isProduction;
      const rawMessage = isDev ? (err as any).message : 'Authentication failed';

      // Escape for safe embedding: HTML context and JS string literal context.
      const safeHtml = String(rawMessage)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      const safeJs = JSON.stringify(String(rawMessage));

      const nonce = randomBytes(16).toString('base64');
      res.setHeader('Content-Security-Policy', `script-src 'nonce-${nonce}'`);
      res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Failed</title></head>
          <body>
            <p>Authentication failed: ${safeHtml}</p>
            <script nonce="${nonce}">
              if (window.opener) {
                window.opener.postMessage(
                  { type: 'OAUTH_RESULT', status: 'ERROR', message: ${safeJs} },
                  '${corsOrigin}'
                );
                setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `;
      return res.setHeader('Content-Type', 'text/html').send(html);
    }
  }

  private clearCookiesOnFailure(res: Response, isProduction: boolean) {
    res.clearCookie('oauth_state_id', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: RequestUser) {
    // Fetch from DB so we always return fresh name/picture
    // without embedding them in the JWT (which is stored as a cookie).
    const profile = await this.authService.getProfile(user.id);
    return { user: profile };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.authService.updateProfile(user.id, dto);
    return { status: 'SUCCESS', user: updated };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
    );
    return { status: 'SUCCESS', message: 'Password updated successfully' };
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    const isProduction = this.configService.get<string>('env') === 'production';

    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });

    return res.json({ message: 'Logged out successfully' });
  }
}
