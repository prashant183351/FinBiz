import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    userId?: string;
    companyId?: string;
    role?: string;
}
/**
 * Middleware to log API requests for audit purposes
 */
export declare const auditLogger: (options?: {
    excludePaths?: string[];
    logRequestBody?: boolean;
    logResponseData?: boolean;
}) => (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=audit.d.ts.map