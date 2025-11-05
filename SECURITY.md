# FinBiz Security & Admin Features

This document outlines the comprehensive security and administrative enhancements implemented in FinBiz.

## 🛡️ Security Features

### 🔐 Two-Factor Authentication (2FA)

FinBiz supports multiple 2FA methods to enhance account security:

#### TOTP (Time-based One-Time Password)
- **Setup**: Generate QR code for authenticator apps (Google Authenticator, Authy, etc.)
- **Verification**: 6-digit codes that change every 30 seconds
- **Backup Codes**: 10 recovery codes for account recovery

#### SMS/Email OTP
- **SMS**: Send OTP to registered phone number
- **Email**: Send OTP to user's email address
- **Temporary**: Codes expire after 10 minutes

#### API Endpoints
```
GET    /api/auth/2fa/status          - Check 2FA status
POST   /api/auth/2fa/setup/totp      - Setup TOTP 2FA
POST   /api/auth/2fa/verify/totp     - Verify TOTP setup
POST   /api/auth/2fa/setup/sms       - Setup SMS 2FA
POST   /api/auth/2fa/setup/email     - Setup Email 2FA
POST   /api/auth/2fa/verify          - Verify OTP setup
POST   /api/auth/2fa/verify-login    - Verify 2FA during login
DELETE /api/auth/2fa                 - Disable 2FA
```

### 🕵️ Audit Trail & Logging

Comprehensive audit logging tracks all user activities:

#### Features
- **Database Logging**: All actions stored in `audit_logs` table
- **File Logging**: Daily rotated log files with Winston
- **Request Tracking**: HTTP method, URL, status codes, duration
- **Sensitive Data Sanitization**: Passwords and tokens are redacted
- **Retention Policy**: Configurable log retention (default: 90 days)

#### Logged Events
- Authentication (login, logout, token refresh)
- Data operations (create, read, update, delete)
- Permission changes
- Backup operations
- Admin actions

#### API Endpoints
```
GET /api/admin/audit              - Get audit logs with filtering
GET /api/admin/audit/stats        - Get audit statistics
POST /api/admin/audit/export      - Export audit logs (JSON/CSV)
```

### 🧮 Enhanced Role-Based Permissions

Granular permission system with predefined roles:

#### Permission Structure
- **Module**: `users`, `companies`, `invoices`, `expenses`, etc.
- **Action**: `create`, `read`, `update`, `delete`, `manage`
- **Format**: `{module}.{action}` (e.g., `invoices.create`)

#### Default Roles
- **Owner**: Full access to everything
- **Admin**: Most permissions except system administration
- **Manager**: Operational permissions without destructive actions
- **Accountant**: Financial module access
- **Employee**: Basic read access

#### API Endpoints
```
GET  /api/admin/permissions       - List all permissions
GET  /api/admin/roles             - List all roles
POST /api/admin/roles             - Create/update role
PUT  /api/admin/roles/:roleId/users/:userId - Assign role
GET  /api/admin/users             - List users with roles
```

### ☁️ Automated Encrypted Backups

Daily automated database backups with encryption:

#### Features
- **Encryption**: AES-256-CBC encryption at rest
- **Cloud Storage**: AWS S3 integration
- **Scheduling**: Daily backups at 2 AM via BullMQ
- **Retention**: Automatic cleanup (30 days default)
- **Verification**: SHA-256 checksums
- **Restoration**: One-click restore functionality

#### Backup Types
- **Full**: Complete database dump
- **Incremental**: Future enhancement

#### API Endpoints
```
POST /api/admin/backup            - Create manual backup
GET  /api/admin/backup            - List backup history
GET  /api/admin/backup/stats      - Backup statistics
POST /api/admin/backup/:id/restore - Restore from backup
DELETE /api/admin/backup/:id      - Delete backup
```

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Email configuration (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@finbiz.com

# AWS S3 (for backups)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=finbiz-backups

# Security keys (generate strong random keys)
BACKUP_ENCRYPTION_KEY=your-32-character-encryption-key-change-this
BACKUP_CODE_ENCRYPTION_KEY=your-32-character-backup-key-change-this
```

### Database Initialization

The system automatically initializes default permissions and roles on startup. The following tables are created:

- `two_factor` - 2FA settings
- `audit_logs` - Activity logs
- `permissions` - Available permissions
- `role_permissions` - Role-permission mappings
- `backups` - Backup records

## 🚀 Usage Examples

### Setting up 2FA

```javascript
// 1. Setup TOTP
const response = await fetch('/api/auth/2fa/setup/totp', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { qrCodeUrl, backupCodes } = await response.json();

// 2. Display QR code to user and save backup codes

// 3. Verify setup
await fetch('/api/auth/2fa/verify/totp', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ token: '123456' })
});
```

### Checking Permissions

```javascript
import { PermissionsService } from './services/permissions.service';

// Check specific permission
const hasPermission = await PermissionsService.hasPermission(
  userId, companyId, 'invoices.create'
);

// Check multiple permissions
const hasAll = await PermissionsService.hasAllPermissions(
  userId, companyId, ['invoices.create', 'invoices.update']
);
```

### Manual Backup

```javascript
// Trigger manual backup
const response = await fetch('/api/admin/backup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'full',
    encrypt: true,
    uploadToCloud: true
  })
});
```

## 📊 Monitoring & Compliance

### Audit Dashboard
- View recent activities
- Filter by user, action, resource
- Export logs for compliance
- Monitor failed login attempts

### Backup Monitoring
- Track backup success/failure
- View storage usage
- Monitor retention policies
- Alert on backup failures

### Security Metrics
- Failed login attempts
- 2FA adoption rate
- Permission usage statistics
- Audit log volume

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **Key Rotation**: Regularly rotate encryption keys
3. **Backup Testing**: Regularly test backup restoration
4. **Log Monitoring**: Set up alerts for suspicious activities
5. **Access Reviews**: Regularly review user permissions
6. **2FA Enforcement**: Consider making 2FA mandatory for sensitive roles

## 🐛 Troubleshooting

### Common Issues

**2FA Setup Fails**
- Check SMTP configuration
- Verify email/phone number format
- Check application logs

**Backup Upload Fails**
- Verify AWS credentials
- Check S3 bucket permissions
- Ensure bucket exists

**Permission Denied**
- Check user role assignments
- Verify permission mappings
- Review middleware configuration

### Logs Location
- Application logs: `logs/audit-YYYY-MM-DD.log`
- Error logs: `logs/error-YYYY-MM-DD.log`
- Database backups: Configured S3 bucket or local `temp/` directory

## 📈 Future Enhancements

- **Advanced Audit**: Real-time alerting and anomaly detection
- **SSO Integration**: SAML/OAuth support
- **Advanced Backup**: Incremental backups and point-in-time recovery
- **Compliance Reports**: Automated compliance reporting (GDPR, SOX, etc.)
- **Threat Detection**: AI-powered security monitoring
- **Multi-tenant Isolation**: Enhanced data isolation for multi-tenant deployments

---

For technical support or questions about the security implementation, please refer to the codebase documentation or contact the development team.
