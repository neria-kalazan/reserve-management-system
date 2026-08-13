import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IssuedOtpChallenge, IssueOtpParams, OtpService } from './otp.service';

@Injectable()
export class DevelopmentOtpService extends OtpService {
  private readonly logger = new Logger(DevelopmentOtpService.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async issueOtp(params: IssueOtpParams): Promise<IssuedOtpChallenge> {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + this.getOtpTtlMs());

    if (!this.isProduction()) {
      this.logger.log(`Development OTP for activation ${params.activationId} (${params.phone}): ${otp}`);
    }

    return {
      codeHash: this.hashOtp(otp),
      expiresAt,
      maxAttempts: this.getMaxAttempts(),
    };
  }

  verifyOtp(rawOtp: string, codeHash: string): boolean {
    const candidate = Buffer.from(this.hashOtp(rawOtp), 'hex');
    const stored = Buffer.from(codeHash, 'hex');

    if (candidate.length !== stored.length) {
      return false;
    }

    return timingSafeEqual(candidate, stored);
  }

  private generateOtp() {
    const length = this.getOtpLength();
    let otp = '';

    for (let index = 0; index < length; index += 1) {
      otp += randomInt(0, 10).toString();
    }

    return otp;
  }

  private hashOtp(otp: string) {
    return createHmac('sha256', this.getHashSecret()).update(otp).digest('hex');
  }

  private getOtpLength() {
    return Number(this.configService.get<string>('OTP_LENGTH') ?? '6');
  }

  private getOtpTtlMs() {
    const seconds = Number(this.configService.get<string>('OTP_TTL_SECONDS') ?? '300');
    return seconds * 1000;
  }

  private getMaxAttempts() {
    return Number(this.configService.get<string>('OTP_MAX_ATTEMPTS') ?? '5');
  }

  private getHashSecret() {
    return this.configService.get<string>('OTP_HASH_SECRET') ?? 'development-otp-secret';
  }

  private isProduction() {
    return (this.configService.get<string>('NODE_ENV') ?? 'development').toLowerCase() === 'production';
  }
}