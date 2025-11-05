"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = void 0;
const audit_service_1 = require("../services/audit.service");
/**
 * Middleware to log API requests for audit purposes
 */
const auditLogger = (options = {}) => {
    const { excludePaths = [], logRequestBody = false, logResponseData = false } = options;
    return (req, res, next) => {
        const startTime = Date.now();
        // Skip logging for excluded paths
        if (excludePaths.some(path => req.path.startsWith(path))) {
            return next();
        }
        // Store original response methods to intercept response
        const originalSend = res.send;
        const originalJson = res.json;
        let responseData = null;
        let responseSent = false;
        // Intercept response to capture data
        const captureResponse = (data) => {
            if (!responseSent && logResponseData) {
                try {
                    responseData = typeof data === 'string' ? JSON.parse(data) : data;
                }
                catch (e) {
                    // Ignore parsing errors
                }
            }
            responseSent = true;
            return data;
        };
        res.send = function (data) {
            captureResponse(data);
            return originalSend.call(this, data);
        };
        res.json = function (data) {
            captureResponse(data);
            return originalJson.call(this, data);
        };
        // Log after response is sent
        res.on('finish', async () => {
            try {
                const duration = Date.now() - startTime;
                const userId = req.userId;
                const companyId = req.companyId;
                // Extract resource and action from URL
                const { resource, action, resourceId } = extractResourceInfo(req);
                // Prepare audit data
                const auditData = {
                    userId,
                    companyId,
                    action,
                    resource,
                    resourceId,
                    details: {
                        method: req.method,
                        url: req.originalUrl,
                        statusCode: res.statusCode,
                        duration,
                        userAgent: req.get('User-Agent'),
                        ...(logRequestBody && req.body && Object.keys(req.body).length > 0 && {
                            requestBody: sanitizeRequestBody(req.body)
                        }),
                        ...(logResponseData && responseData && {
                            responseData: sanitizeResponseData(responseData)
                        })
                    },
                    ipAddress: getClientIP(req),
                    userAgent: req.get('User-Agent'),
                    success: res.statusCode < 400
                };
                // Only log if there's a user or it's a sensitive operation
                if (userId || isSensitiveOperation(req)) {
                    await audit_service_1.AuditService.log(auditData);
                }
            }
            catch (error) {
                console.error('Audit logging error:', error);
                // Don't throw to avoid breaking the response
            }
        });
        next();
    };
};
exports.auditLogger = auditLogger;
/**
 * Extract resource, action, and ID from request
 */
function extractResourceInfo(req) {
    const pathParts = req.path.split('/').filter(Boolean);
    const method = req.method;
    // Map HTTP methods to actions
    const methodToAction = {
        GET: 'view',
        POST: 'create',
        PUT: 'update',
        PATCH: 'update',
        DELETE: 'delete'
    };
    const action = methodToAction[method] || 'access';
    // Extract resource from path
    let resource = 'unknown';
    let resourceId;
    if (pathParts.length >= 2) {
        const apiIndex = pathParts.indexOf('api');
        if (apiIndex !== -1 && apiIndex < pathParts.length - 1) {
            resource = pathParts[apiIndex + 1]; // e.g., 'companies', 'users', 'invoices'
            // Check if next part is an ID (UUID format or number)
            const nextPart = pathParts[apiIndex + 2];
            if (nextPart && (isUUID(nextPart) || /^\d+$/.test(nextPart))) {
                resourceId = nextPart;
            }
        }
    }
    // Special cases
    if (req.path.includes('/auth/login')) {
        return { resource: 'auth', action: 'login' };
    }
    if (req.path.includes('/auth/logout')) {
        return { resource: 'auth', action: 'logout' };
    }
    if (req.path.includes('/auth/refresh')) {
        return { resource: 'auth', action: 'refresh_token' };
    }
    return { resource, action, resourceId };
}
/**
 * Check if operation should always be logged (sensitive operations)
 */
function isSensitiveOperation(req) {
    const sensitivePaths = [
        '/api/auth/login',
        '/api/auth/logout',
        '/api/auth/refresh',
        '/api/admin',
        '/api/backup'
    ];
    return sensitivePaths.some(path => req.path.startsWith(path));
}
/**
 * Get client IP address
 */
function getClientIP(req) {
    return (req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        'unknown');
}
/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object')
        return body;
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'backupCodes'];
    const sanitized = { ...body };
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    return sanitized;
}
/**
 * Sanitize response data to remove sensitive information
 */
function sanitizeResponseData(data) {
    if (!data || typeof data !== 'object')
        return data;
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'backupCodes'];
    const sanitized = { ...data };
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    return sanitized;
}
/**
 * Check if string is UUID format
 */
function isUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}
//# sourceMappingURL=audit.js.map