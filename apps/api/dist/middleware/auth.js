"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireCompanyAccess = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        console.error('JWT verification error:', error);
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
// Middleware to check if user has required permissions for a company
const requireCompanyAccess = (requiredPermissions = []) => {
    return async (req, res, next) => {
        try {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            const userId = req.userId;
            const companyId = req.params.companyId || req.query.companyId || req.body.companyId;
            if (!userId || !companyId) {
                return res.status(400).json({ error: 'User ID and Company ID required' });
            }
            // Check if user is a member of the company
            const membership = await prisma.membership.findUnique({
                where: {
                    userId_companyId: {
                        userId,
                        companyId: companyId
                    }
                },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true
                                }
                            }
                        }
                    }
                }
            });
            if (!membership) {
                return res.status(403).json({ error: 'Access denied: Not a member of this company' });
            }
            // Check permissions if required
            if (requiredPermissions.length > 0) {
                const userPermissions = membership.role.permissions.map(rp => rp.permission.name);
                const hasPermission = requiredPermissions.every(permission => userPermissions.includes(permission));
                if (!hasPermission) {
                    return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
                }
            }
            // Add company and role info to request
            req.companyId = companyId;
            req.role = membership.role.name;
            next();
        }
        catch (error) {
            console.error('Company access check error:', error);
            res.status(500).json({ error: 'Failed to verify company access' });
        }
    };
};
exports.requireCompanyAccess = requireCompanyAccess;
// Middleware for role-based access control
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            const userId = req.userId;
            const companyId = req.params.companyId || req.query.companyId || req.body.companyId;
            if (!userId || !companyId) {
                return res.status(400).json({ error: 'User ID and Company ID required' });
            }
            const membership = await prisma.membership.findUnique({
                where: {
                    userId_companyId: {
                        userId,
                        companyId: companyId
                    }
                },
                include: {
                    role: true
                }
            });
            if (!membership || !allowedRoles.includes(membership.role.name)) {
                return res.status(403).json({ error: 'Access denied: Insufficient role' });
            }
            req.companyId = companyId;
            req.role = membership.role.name;
            next();
        }
        catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ error: 'Failed to verify role' });
        }
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map