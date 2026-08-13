import { randomBytes, createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp/otp.service';
import { AuthService, GoogleProfilePayload } from '../auth/auth.service';

const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;
const GOOGLE_LINK_STATE_TTL_MS = 10 * 60 * 1000;

interface GoogleLinkStateRecord {
  activationId: string;
  userId: string;
  expiresAt: Date;
}

@Injectable()
export class ActivationsService {
  private readonly logger = new Logger(ActivationsService.name);
  private readonly googleLinkStates = new Map<string, GoogleLinkStateRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly authService: AuthService,
  ) {}

  async createActivation(creatorUserId: string, userId: string) {
    const [creator, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: creatorUserId },
        select: { id: true, companyId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, companyId: true, activatedAt: true },
      }),
    ]);

    if (!creator) {
      throw new NotFoundException('User not found');
    }

    if (!targetUser || targetUser.companyId !== creator.companyId) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.activatedAt) {
      throw new ConflictException('User is already activated');
    }

    const now = new Date();
    await this.prisma.activation.updateMany({
      where: {
        userId: targetUser.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(now.getTime() + ACTIVATION_TTL_MS);

    const activation = await this.prisma.activation.create({
      data: {
        userId: targetUser.id,
        createdByUserId: creator.id,
        companyId: creator.companyId,
        tokenHash,
        expiresAt,
      },
      select: {
        id: true,
        userId: true,
        createdByUserId: true,
        companyId: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      ...activation,
      activationUrl: this.buildActivationUrl(rawToken),
    };
  }

  async inspectActivation(token: string) {
    const activation = await this.getValidActivationByToken(token);

    return {
      activationId: activation.id,
      expiresAt: activation.expiresAt,
      user: {
        id: activation.user.id,
        firstName: activation.user.firstName,
        lastName: activation.user.lastName,
      },
    };
  }

  async verifyActivationPhone(token: string, phone: string) {
    const activation = await this.getValidActivationByToken(token);
    const normalizedSubmittedPhone = this.normalizePhone(phone);
    const normalizedStoredPhone = this.normalizePhone(activation.user.phone);

    if (normalizedSubmittedPhone !== normalizedStoredPhone) {
      this.logger.warn(`Activation phone verification failed for activation ${activation.id} and user ${activation.user.id}`);
      throw new BadRequestException('Verification failed');
    }

    await this.prisma.user.update({
      where: { id: activation.user.id },
      data: { phoneVerifiedAt: new Date() },
    });

    return {
      verified: true,
      activationId: activation.id,
    };
  }

  async requestOtp(token: string) {
    const activation = await this.getValidActivationByToken(token);

    if (!activation.user.phoneVerifiedAt) {
      throw new BadRequestException('Phone verification is required');
    }

    const now = new Date();
    await this.prisma.activationOtpChallenge.updateMany({
      where: {
        activationId: activation.id,
        usedAt: null,
        lockedAt: null,
        expiresAt: { gt: now },
      },
      data: { lockedAt: now },
    });

    const issuedChallenge = await this.otpService.issueOtp({
      activationId: activation.id,
      phone: activation.user.phone,
    });

    const challenge = await this.prisma.activationOtpChallenge.create({
      data: {
        activationId: activation.id,
        codeHash: issuedChallenge.codeHash,
        expiresAt: issuedChallenge.expiresAt,
        maxAttempts: issuedChallenge.maxAttempts,
      },
      select: {
        id: true,
        activationId: true,
        expiresAt: true,
        maxAttempts: true,
        createdAt: true,
      },
    });

    return {
      challengeId: challenge.id,
      activationId: challenge.activationId,
      expiresAt: challenge.expiresAt,
      maxAttempts: challenge.maxAttempts,
      createdAt: challenge.createdAt,
    };
  }

  async verifyOtp(token: string, otp: string) {
    const activation = await this.getValidActivationByToken(token);
    const challenge = await this.getLatestChallenge(activation.id);

    if (!challenge) {
      throw new BadRequestException('OTP challenge not found');
    }

    const now = new Date();

    if (challenge.expiresAt <= now) {
      throw new BadRequestException('OTP challenge has expired');
    }

    if (challenge.lockedAt) {
      throw new BadRequestException('OTP challenge is locked');
    }

    if (challenge.usedAt) {
      throw new BadRequestException('OTP challenge has already been used');
    }

    const verified = this.otpService.verifyOtp(otp, challenge.codeHash);

    if (!verified) {
      const nextAttemptCount = challenge.attemptCount + 1;
      const shouldLock = nextAttemptCount >= challenge.maxAttempts;

      await this.prisma.activationOtpChallenge.update({
        where: { id: challenge.id },
        data: {
          attemptCount: nextAttemptCount,
          ...(shouldLock ? { lockedAt: now } : {}),
        },
      });

      throw new BadRequestException('OTP verification failed');
    }

    await this.prisma.activationOtpChallenge.update({
      where: { id: challenge.id },
      data: {
        usedAt: now,
      },
    });

    return {
      verified: true,
      activationId: activation.id,
      challengeId: challenge.id,
    };
  }

  async startGoogleLinking(token: string) {
    const activation = await this.getEligibleActivationForGoogleLinkingByToken(token);
    const state = randomBytes(24).toString('base64url');

    this.cleanupExpiredGoogleLinkStates();
    this.googleLinkStates.set(state, {
      activationId: activation.id,
      userId: activation.user.id,
      expiresAt: new Date(Date.now() + GOOGLE_LINK_STATE_TTL_MS),
    });

    return this.authService.buildGoogleAuthorizationUrl(state);
  }

  async completeGoogleLinking(state: string, profile: GoogleProfilePayload) {
    const linkState = this.consumeGoogleLinkState(state);

    if (!profile.sub || !profile.verified_email) {
      throw new BadRequestException('Google identity could not be verified');
    }

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const activation = await tx.activation.findUnique({
        where: { id: linkState.activationId },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          revokedAt: true,
          usedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
              phoneVerifiedAt: true,
              activatedAt: true,
              googleSubject: true,
            },
          },
        },
      });

      if (!activation || activation.userId !== linkState.userId) {
        throw new NotFoundException('Activation not found');
      }

      if (activation.expiresAt <= now || activation.revokedAt || activation.usedAt) {
        throw new BadRequestException('Activation is no longer valid');
      }

      if (!activation.user.isActive) {
        throw new BadRequestException('User is inactive');
      }

      if (!activation.user.phoneVerifiedAt) {
        throw new BadRequestException('Phone verification is required');
      }

      if (activation.user.googleSubject) {
        throw new ConflictException('Google identity is already linked');
      }

      const successfulOtpChallenge = await tx.activationOtpChallenge.findFirst({
        where: {
          activationId: activation.id,
          usedAt: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (!successfulOtpChallenge) {
        throw new BadRequestException('OTP verification is required');
      }

      const collision = await tx.user.findFirst({
        where: {
          googleSubject: profile.sub,
          id: { not: activation.user.id },
        },
        select: { id: true },
      });

      if (collision) {
        throw new ConflictException('Google identity is already linked');
      }

      const updatedUser = await tx.user.update({
        where: { id: activation.user.id },
        data: {
          googleSubject: profile.sub,
          googleLinkedAt: now,
          activatedAt: now,
          lastLoginAt: now,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });

      await tx.activation.update({
        where: { id: activation.id },
        data: { usedAt: now },
      });

      return updatedUser;
    });

    return {
      user: result,
      sessionToken: this.authService.createSessionToken(result.id),
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizePhone(phone: string) {
    return phone.replace(/\D+/g, '');
  }

  private cleanupExpiredGoogleLinkStates() {
    const now = new Date();
    for (const [state, record] of this.googleLinkStates.entries()) {
      if (record.expiresAt <= now) {
        this.googleLinkStates.delete(state);
      }
    }
  }

  private consumeGoogleLinkState(state: string) {
    this.cleanupExpiredGoogleLinkStates();
    const record = this.googleLinkStates.get(state);

    if (!record) {
      throw new BadRequestException('OAuth state is no longer valid');
    }

    this.googleLinkStates.delete(state);
    return record;
  }

  private async getEligibleActivationForGoogleLinkingByToken(token: string) {
    const activation = await this.getValidActivationByToken(token);

    if (!activation.user.isActive) {
      throw new BadRequestException('User is inactive');
    }

    if (!activation.user.phoneVerifiedAt) {
      throw new BadRequestException('Phone verification is required');
    }

    if (activation.user.googleSubject) {
      throw new ConflictException('Google identity is already linked');
    }

    const successfulOtpChallenge = await this.prisma.activationOtpChallenge.findFirst({
      where: {
        activationId: activation.id,
        usedAt: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!successfulOtpChallenge) {
      throw new BadRequestException('OTP verification is required');
    }

    return activation;
  }

  private async getLatestChallenge(activationId: string) {
    return this.prisma.activationOtpChallenge.findFirst({
      where: { activationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        activationId: true,
        codeHash: true,
        expiresAt: true,
        usedAt: true,
        attemptCount: true,
        maxAttempts: true,
        lockedAt: true,
        createdAt: true,
      },
    });
  }

  private async getValidActivationByToken(token: string) {
    const activation = await this.prisma.activation.findUnique({
      where: { tokenHash: this.hashToken(token) },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            phoneVerifiedAt: true,
            googleSubject: true,
            isActive: true,
          },
        },
      },
    });

    if (!activation) {
      throw new NotFoundException('Activation not found');
    }

    const now = new Date();

    if (activation.expiresAt <= now || activation.revokedAt || activation.usedAt) {
      throw new BadRequestException('Activation is no longer valid');
    }

    return activation;
  }

  private buildActivationUrl(token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const base = frontendUrl.endsWith('/') ? frontendUrl : `${frontendUrl}/`;

    try {
      return new URL(`activate/${token}`, base).toString();
    } catch {
      throw new BadRequestException('Frontend URL is not configured correctly');
    }
  }
}