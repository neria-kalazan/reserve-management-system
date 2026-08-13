export interface IssueOtpParams {
  activationId: string;
  phone: string;
}

export interface IssuedOtpChallenge {
  codeHash: string;
  expiresAt: Date;
  maxAttempts: number;
}

export abstract class OtpService {
  abstract issueOtp(params: IssueOtpParams): Promise<IssuedOtpChallenge>;
  abstract verifyOtp(rawOtp: string, codeHash: string): boolean;
}