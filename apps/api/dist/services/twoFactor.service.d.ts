export interface TwoFactorSetup {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}
export interface TwoFactorVerification {
    verified: boolean;
    backupCodeUsed?: boolean;
}
export declare class TwoFactorService {
    private static transporter;
    /**
     * Generate TOTP secret and QR code for setup
     */
    static generateTOTPSecret(userId: string, email: string): Promise<TwoFactorSetup>;
    /**
     * Verify TOTP token during setup
     */
    static verifyTOTPSetup(userId: string, token: string): Promise<boolean>;
    /**
     * Verify TOTP token during login
     */
    static verifyTOTP(userId: string, token: string): Promise<TwoFactorVerification>;
    /**
     * Send OTP via SMS (placeholder - integrate with SMS service)
     */
    static sendSMSOTP(userId: string, phoneNumber: string): Promise<string>;
    /**
     * Send OTP via Email
     */
    static sendEmailOTP(userId: string, email: string): Promise<void>;
    /**
     * Verify OTP (SMS/Email)
     */
    static verifyOTP(userId: string, token: string): Promise<boolean>;
    /**
     * Disable 2FA for user
     */
    static disable2FA(userId: string): Promise<void>;
    /**
     * Check if user has 2FA enabled
     */
    static is2FAEnabled(userId: string): Promise<boolean>;
    /**
     * Get 2FA status for user
     */
    static get2FAStatus(userId: string): Promise<{
        enabled: boolean;
        type: null;
        verified: boolean;
    } | {
        enabled: boolean;
        type: string;
        verified: boolean;
    }>;
    private static generateOTP;
    private static generateBackupCodes;
    private static encryptBackupCodes;
    private static decryptBackupCodes;
}
//# sourceMappingURL=twoFactor.service.d.ts.map