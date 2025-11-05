import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { TwoFactorService } from '../services/twoFactor.service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'

export interface AuthRequest extends Request {
  userId?: string
  companyId?: string
  role?: string
}

// Middleware to authenticate JWT token
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    req.userId = decoded.userId
    next()
  } catch (error) {
    console.error('JWT verification error:', error)
    res.status(403).json({ error: 'Invalid or expired token' })
  }
}

// Middleware to check if user has required permissions for a company
export const requireCompanyAccess = (requiredPermissions: string[] = []) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      const userId = req.userId
      const companyId = req.params.companyId || req.query.companyId || req.body.companyId

      if (!userId || !companyId) {
        return res.status(400).json({ error: 'User ID and Company ID required' })
      }

      // Check if user is a member of the company
      const membership = await prisma.membership.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId: companyId as string
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
      })

      if (!membership) {
        return res.status(403).json({ error: 'Access denied: Not a member of this company' })
      }

      // Check permissions if required
      if (requiredPermissions.length > 0) {
        const userPermissions = membership.role.permissions.map(rp => rp.permission.name)
        const hasPermission = requiredPermissions.every(permission =>
          userPermissions.includes(permission)
        )

        if (!hasPermission) {
          return res.status(403).json({ error: 'Access denied: Insufficient permissions' })
        }
      }

      // Add company and role info to request
      req.companyId = companyId as string
      req.role = membership.role.name

      next()
    } catch (error) {
      console.error('Company access check error:', error)
      res.status(500).json({ error: 'Failed to verify company access' })
    }
  }
}

// Middleware for role-based access control
export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      const userId = req.userId
      const companyId = req.params.companyId || req.query.companyId || req.body.companyId

      if (!userId || !companyId) {
        return res.status(400).json({ error: 'User ID and Company ID required' })
      }

      const membership = await prisma.membership.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId: companyId as string
          }
        },
        include: {
          role: true
        }
      })

      if (!membership || !allowedRoles.includes(membership.role.name)) {
        return res.status(403).json({ error: 'Access denied: Insufficient role' })
      }

      req.companyId = companyId as string
      req.role = membership.role.name

      next()
    } catch (error) {
      console.error('Role check error:', error)
      res.status(500).json({ error: 'Failed to verify role' })
    }
  }
}
