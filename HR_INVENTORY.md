# FinBiz HR & Inventory Management Features

This document outlines the comprehensive HR & Payroll and Inventory & Stock Intelligence enhancements implemented in FinBiz.

## 👥 HR & Payroll Management

### 📋 Leave Management
- **Leave Types**: Casual, Sick, Earned, Maternity, Paternity leave tracking
- **Leave Requests**: Submit, approve, and reject leave requests
- **Leave Balance**: Automatic calculation of remaining leave days
- **Approval Workflow**: Manager approval system for leave requests

#### API Endpoints
```
POST /api/hr/leave                    - Submit leave request
GET  /api/hr/leave                    - Get leave requests
PUT  /api/hr/leave/:id/approve        - Approve leave request
PUT  /api/hr/leave/:id/reject         - Reject leave request
GET  /api/hr/leave/balance/:employeeId - Get leave balance
```

### 💰 Incentives & Overtime Tracking
- **Incentive Types**: Overtime, Bonus, Commission, Performance bonuses
- **Automatic Calculation**: Payroll integration for incentive processing
- **Monthly Processing**: Mark incentives as processed in payroll
- **Historical Tracking**: Complete incentive history per employee

#### API Endpoints
```
POST /api/hr/incentives               - Add incentive
GET  /api/hr/incentives               - Get incentives
POST /api/hr/incentives/process/:emp/:month/:year - Process for payroll
```

### 📊 Compliance Management (PF/ESI/TDS)
- **Automated Tracking**: Provident Fund, ESI, and TDS calculations
- **Government Compliance**: Ready for Indian government compliance
- **Submission Tracking**: Record submission dates and references
- **Monthly Reporting**: Compliance reports for each employee

#### API Endpoints
```
POST /api/hr/compliance               - Submit compliance record
GET  /api/hr/compliance               - Get compliance records
```

### 📄 Payslip Generation
- **Comprehensive Payslips**: Earnings, deductions, incentives, compliance
- **PDF Generation**: Ready for PDF export (extendable)
- **Monthly History**: Complete payroll history per employee
- **Tax Calculations**: TDS and other deductions tracking

#### API Endpoints
```
GET /api/hr/payslip/:emp/:month/:year  - Generate payslip data
```

### 📈 Attendance Summary
- **Monthly Reports**: Working hours, overtime, attendance percentage
- **Automated Calculations**: Hours worked from check-in/check-out
- **Overtime Tracking**: Extra hours worked calculation
- **Reporting**: Monthly attendance summaries

#### API Endpoints
```
GET /api/hr/attendance/summary/:emp/:month/:year - Get attendance summary
```

## 📦 Inventory & Stock Intelligence

### 🏷️ Product Management
- **Comprehensive Product Data**: SKU, barcode, category, supplier info
- **Stock Levels**: Min/max stock, reorder points, current stock
- **Cost Tracking**: Cost price, selling price, valuation
- **Supplier Integration**: Link products to vendors

#### API Endpoints
```
POST /api/inventory/products           - Create/update product
GET  /api/inventory/products           - Get products with stock
GET  /api/inventory/products/:id/stock - Get product stock level
```

### 📊 Stock Movement Tracking
- **Movement Types**: In, Out, Adjustment, Transfer
- **Reference Tracking**: Link to invoices, orders, reasons
- **Cost Tracking**: Unit prices and total values
- **Audit Trail**: Complete stock movement history

#### API Endpoints
```
POST /api/inventory/stock/movement     - Record stock movement
GET  /api/inventory/stock/movements    - Get stock movements
```

### 🏢 Vendor Management
- **Vendor Profiles**: Contact info, payment terms, GST details
- **Product Linking**: Associate vendors with their products
- **Purchase History**: Track all purchases from vendors
- **Active Management**: Enable/disable vendor relationships

#### API Endpoints
```
POST /api/inventory/vendors             - Create/update vendor
GET  /api/inventory/vendors             - Get vendors
```

### 📋 Purchase Order Management
- **Auto Generation**: Low stock triggers automatic PO creation
- **Manual Creation**: Create POs for specific products
- **Status Tracking**: Draft → Sent → Confirmed → Received
- **Item Management**: Multiple items per purchase order

#### API Endpoints
```
POST /api/inventory/purchase-orders     - Create purchase order
GET  /api/inventory/purchase-orders     - Get purchase orders
PUT  /api/inventory/purchase-orders/:id/status - Update PO status
```

### 🚨 Stock Alerts & Re-order Intelligence
- **Smart Alerts**: Low stock, out of stock, over stock notifications
- **AI Predictions**: Analyze patterns for re-order recommendations
- **Auto PO Generation**: Automatic purchase order creation
- **Alert Resolution**: Mark alerts as resolved

#### API Endpoints
```
GET /api/inventory/alerts               - Get stock alerts
PUT /api/inventory/alerts/:id/resolve   - Resolve alert
POST /api/inventory/auto-purchase-orders - Generate auto POs
```

### 📈 Stock Valuation & Reports
- **Real-time Valuation**: Current stock value calculations
- **FIFO/LIFO Support**: Costing method flexibility
- **Inventory Reports**: Comprehensive stock reports
- **Financial Integration**: Link to accounting system

#### API Endpoints
```
GET /api/inventory/reports/valuation    - Get stock valuation
```

### 📱 Barcode/QR Scanning Integration
- **Scan Support**: Product lookup and stock operations via scan
- **Multi-purpose**: Lookup, stock-in, stock-out operations
- **Reference Tracking**: Automatic reference generation
- **Mobile Ready**: Designed for mobile scanning apps

#### API Endpoints
```
POST /api/inventory/scan                - Process barcode/QR scan
```

## 🔧 Background Jobs & Automation

### ⏰ Scheduled Tasks
- **Stock Alerts**: Check every 6 hours for stock level issues
- **Auto PO Generation**: Daily at 9 AM for low stock items
- **Backup Automation**: Daily encrypted database backups
- **Report Calculation**: Automated financial report generation

### 🤖 Intelligent Automation
- **Re-order Intelligence**: AI-based stock level predictions
- **Vendor Auto-selection**: Choose best vendor based on history
- **Compliance Reminders**: Automatic compliance deadline tracking
- **Payroll Processing**: Automated incentive processing

## 📊 Database Schema Additions

### HR Models
```sql
-- Leave management
model Leave {
  id, employeeId, type, startDate, endDate, days, reason, status, approvedBy, approvedAt, notes
}

-- Incentives and overtime
model Incentive {
  id, employeeId, type, amount, description, date, month, year, processed
}

-- Government compliance
model ComplianceRecord {
  id, employeeId, type, month, year, amount, status, reference, submittedAt, notes
}
```

### Inventory Models
```sql
-- Product catalog
model Product {
  id, companyId, name, sku, barcode, category, minStock, reorderPoint, costPrice, sellingPrice, supplierId
}

-- Stock tracking
model StockMovement {
  id, productId, type, quantity, unitPrice, reference, reason, performedBy, createdAt
}

-- Vendor management
model Vendor {
  id, companyId, name, contactPerson, email, phone, address, gstin, paymentTerms, active
}

-- Purchase orders
model PurchaseOrder {
  id, companyId, vendorId, orderNumber, status, totalAmount, createdBy, approvedBy, sentAt
}

model PurchaseOrderItem {
  id, orderId, productId, quantity, unitPrice, totalAmount, receivedQty, status
}

-- Alerts and notifications
model StockAlert {
  id, productId, type, threshold, currentStock, message, status, resolvedAt
}
```

## 🔐 Permission System Integration

### HR Permissions
- `employees.view` - View employee profiles and leave
- `employees.manage` - Approve leave, manage employees
- `payroll.view` - View payroll and incentives
- `payroll.manage` - Create payroll, manage incentives

### Inventory Permissions
- `products.view` - View products and stock levels
- `products.manage` - Create products, manage stock, POs

## 🚀 Usage Examples

### Leave Management
```javascript
// Submit leave request
const leave = await fetch('/api/hr/leave', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: 'emp-123',
    type: 'casual',
    startDate: '2025-01-15',
    endDate: '2025-01-16',
    reason: 'Family function'
  })
});

// Approve leave
await fetch('/api/hr/leave/leave-456/approve', {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ notes: 'Approved for family function' })
});
```

### Stock Management
```javascript
// Record stock movement
await fetch('/api/inventory/stock/movement', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'prod-123',
    type: 'in',
    quantity: 50,
    unitPrice: 100,
    reference: 'PO-2025-001',
    reason: 'purchase'
  })
});

// Check stock alerts
const alerts = await fetch('/api/inventory/alerts', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Barcode Scanning
```javascript
// Process barcode scan
const result = await fetch('/api/inventory/scan', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    barcode: '123456789',
    type: 'stock_out',
    productId: 'prod-123',
    quantity: 1
  })
});
```

## 📈 Business Benefits

### HR Management
- **Reduced Administrative Work**: Automated leave and payroll processing
- **Compliance Assurance**: Built-in PF/ESI/TDS tracking
- **Employee Satisfaction**: Self-service leave requests and payslips
- **Accurate Payroll**: Automated incentive and overtime calculations

### Inventory Management
- **Zero Stock-outs**: AI-powered re-order alerts and auto POs
- **Cost Optimization**: Accurate stock valuation and FIFO/LIFO tracking
- **Operational Efficiency**: Barcode scanning for fast operations
- **Vendor Management**: Automated PO generation and supplier tracking

## 🔄 Integration Points

### With Existing Systems
- **Financial Module**: Stock valuation feeds into balance sheet
- **Invoice System**: Stock movements on sales/purchases
- **User Management**: Employee profiles link to HR features
- **Audit System**: All HR and inventory actions are logged

### External Integrations
- **Barcode Scanners**: Mobile apps can integrate with scanning
- **Email Systems**: Automated PO emails to vendors
- **Government APIs**: PF/ESI submission integration
- **Accounting Software**: Stock valuation export

## 📋 Implementation Checklist

- [x] Database schema updates for HR and inventory
- [x] HR service with leave, incentive, compliance management
- [x] Inventory service with product, stock, vendor management
- [x] Purchase order automation and stock alerts
- [x] API routes for all HR and inventory operations
- [x] Background jobs for alerts and auto PO generation
- [x] Permission system integration
- [x] Audit logging for all operations
- [x] Mobile-ready barcode scanning support

## 🎯 Next Steps

1. **Frontend Integration**: Build React components for HR and inventory UIs
2. **Mobile App**: Develop employee app for attendance and leave management
3. **Barcode Integration**: Implement actual barcode scanning in mobile apps
4. **Email Templates**: Create professional PO email templates
5. **Advanced Analytics**: Add inventory turnover and stock aging reports
6. **Multi-location**: Support for multiple warehouse locations
7. **Supplier Portal**: Vendor portal for PO management

---

These HR and Inventory features transform FinBiz into a comprehensive business management platform, ready for modern enterprise operations with intelligent automation and compliance support.
