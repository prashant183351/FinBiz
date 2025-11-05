"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const inventory_service_1 = require("../services/inventory.service");
const router = express_1.default.Router();
// Apply authentication and audit logging to all inventory routes
router.use(auth_1.authenticateToken);
router.use((0, audit_1.auditLogger)());
// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================
// POST /api/inventory/products - Create or update product
router.post('/products', (0, auth_1.requireCompanyAccess)(['products.manage']), async (req, res) => {
    try {
        const productData = req.body;
        const createdBy = req.userId;
        const product = await inventory_service_1.InventoryService.createOrUpdateProduct(productData, createdBy);
        res.json(product);
    }
    catch (error) {
        console.error('Error creating/updating product:', error);
        res.status(500).json({ error: 'Failed to create or update product' });
    }
});
// GET /api/inventory/products - Get products
router.get('/products', (0, auth_1.requireCompanyAccess)(['products.view']), async (req, res) => {
    try {
        const { category, supplierId, lowStock, search, limit = '50', offset = '0' } = req.query;
        const companyId = req.companyId;
        const products = await inventory_service_1.InventoryService.getProducts(companyId, {
            category: category,
            supplierId: supplierId,
            lowStock: lowStock === 'true',
            search: search
        }, parseInt(limit), parseInt(offset));
        res.json(products);
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
// GET /api/inventory/products/:productId/stock - Get current stock for product
router.get('/products/:productId/stock', (0, auth_1.requireCompanyAccess)(['products.view']), async (req, res) => {
    try {
        const { productId } = req.params;
        const currentStock = await inventory_service_1.InventoryService.getCurrentStock(productId);
        res.json({ productId, currentStock });
    }
    catch (error) {
        console.error('Error fetching product stock:', error);
        res.status(500).json({ error: 'Failed to fetch product stock' });
    }
});
// ============================================================================
// STOCK MOVEMENT MANAGEMENT
// ============================================================================
// POST /api/inventory/stock/movement - Record stock movement
router.post('/stock/movement', (0, auth_1.requireCompanyAccess)(['products.manage']), async (req, res) => {
    try {
        const movementData = req.body;
        const movement = await inventory_service_1.InventoryService.recordStockMovement(movementData);
        res.json(movement);
    }
    catch (error) {
        console.error('Error recording stock movement:', error);
        res.status(500).json({ error: 'Failed to record stock movement' });
    }
});
// GET /api/inventory/stock/movements - Get stock movements
router.get('/stock/movements', (0, auth_1.requireCompanyAccess)(['products.view']), async (req, res) => {
    try {
        const { productId, type, limit = '100', offset = '0' } = req.query;
        const companyId = req.companyId;
        const movements = await inventory_service_1.InventoryService.getStockMovements(productId, companyId, type, parseInt(limit), parseInt(offset));
        res.json(movements);
    }
    catch (error) {
        console.error('Error fetching stock movements:', error);
        res.status(500).json({ error: 'Failed to fetch stock movements' });
    }
});
// ============================================================================
// VENDOR MANAGEMENT
// ============================================================================
// POST /api/inventory/vendors - Create or update vendor
router.post('/vendors', (0, auth_1.requireCompanyAccess)(['products.manage']), async (req, res) => {
    try {
        const vendorData = req.body;
        const createdBy = req.userId;
        const vendor = await inventory_service_1.InventoryService.createOrUpdateVendor(vendorData, createdBy);
        res.json(vendor);
    }
    catch (error) {
        console.error('Error creating/updating vendor:', error);
        res.status(500).json({ error: 'Failed to create or update vendor' });
    }
});
// GET /api/inventory/vendors - Get vendors
router.get('/vendors', (0, auth_1.requireCompanyAccess)(['products.view']), async (req, res) => {
    try {
        const { search, limit = '50', offset = '0' } = req.query;
        const companyId = req.companyId;
        const vendors = await inventory_service_1.InventoryService.getVendors(companyId, search, parseInt(limit), parseInt(offset));
        res.json(vendors);
    }
    catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
});
// ============================================================================
// PURCHASE ORDER MANAGEMENT
// ============================================================================
// POST /api/inventory/purchase-orders - Create purchase order
router.post('/purchase-orders', (0, auth_1.requireCompanyAccess)(['products.manage']), async (req, res) => {
    try {
        const orderData = req.body;
        const order = await inventory_service_1.InventoryService.createPurchaseOrder(orderData);
        res.json(order);
    }
    catch (error) {
        console.error('Error creating purchase order:', error);
        res.status(500).json({ error: 'Failed to create purchase order' });
    }
});
// GET /api/inventory/purchase-orders - Get purchase orders
router.get('/purchase-orders', (0, auth_1.requireCompanyAccess)(['products.view']), async (req, res) => {
    try {
        const { status, vendorId, limit = '50', offset = '0' } = req.query;
        const companyId = req.companyId;
        const orders = await inventory_service_1.InventoryService.getPurchaseOrders(companyId, status, vendorId, parseInt(limit), parseInt(offset));
        res.json(orders);
    }
    catch (error) {
        console.error('Error fetching purchase orders:', error);
        res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
});
// PUT /api/inventory/purchase-orders/:orderId/status - Update purchase order status
router.put('/purchase-orders/:orderId/status', (0, auth_1.requireCompanyAccess)(['products.manage']), async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, notes } = req.body;
        const updatedBy = req.userId;
        const order = await inventory_service_1.InventoryService.updatePurchaseOrderStatus(orderId, status, updatedBy, notes);
        res.json(order);
    }
    catch (error) {
        console.error('Error updating purchase order status:', error);
        res.status(500).json({ error: 'Failed to update purchase order status' });
    }
});
// ============================================================================
// STOCK ALERTS MANAGEMENT
// ============================================================================
// GET /api/inventory/alerts - Get stock alerts
router.get('/alerts', (0, auth_1.requireCompanyAccess)(['products.view']), async (req, res) => {
    try {
        const companyId = req.companyId;
        const alerts = await inventory_service_1.InventoryService.getStockAlerts(companyId);
        res.json(alerts);
    }
    catch (error) {
        console.error('Error fetching stock alerts:', error);
        res.status(500).json({ error: 'Failed to fetch stock alerts' });
    }
});
// PUT /api/inventory/alerts/:alertId/resolve - Resolve stock alert
router.put('/alerts/:alertId/resolve', (0, auth_1.requireCompanyAccess)(['products.manage']), async (req, res) => {
    try {
        const { alertId } = req.params;
        const resolvedBy = req.userId;
        await inventory_service_1.InventoryService.resolveStockAlert(alertId, resolvedBy);
        res.json({ message: 'Alert resolved successfully' });
    }
    catch (error) {
        console.error('Error resolving stock alert:', error);
        res.status(500).json({ error: 'Failed to resolve stock alert' });
    }
});
// ============================================================================
// REPORTS AND ANALYTICS
// ============================================================================
// GET /api/inventory/reports/valuation - Get stock valuation report
router.get('/reports/valuation', (0, auth_1.requireCompanyAccess)(['reports.view']), async (req, res) => {
    try {
        const companyId = req.companyId;
        const report = await inventory_service_1.InventoryService.getStockValuation(companyId);
        res.json(report);
    }
    catch (error) {
        console.error('Error generating stock valuation report:', error);
        res.status(500).json({ error: 'Failed to generate stock valuation report' });
    }
});
// ============================================================================
// AUTOMATED OPERATIONS
// ============================================================================
// POST /api/inventory/auto-purchase-orders - Generate auto purchase orders for low stock
router.post('/auto-purchase-orders', (0, auth_1.requireCompanyAccess)(['products.manage']), async (req, res) => {
    try {
        const companyId = req.companyId;
        const generatedBy = req.userId;
        const orders = await inventory_service_1.InventoryService.generateAutoPurchaseOrders(companyId, generatedBy);
        res.json({
            message: `Generated ${orders.length} auto purchase orders`,
            orders
        });
    }
    catch (error) {
        console.error('Error generating auto purchase orders:', error);
        res.status(500).json({ error: 'Failed to generate auto purchase orders' });
    }
});
// ============================================================================
// BARCODE/QR SCANNING SUPPORT
// ============================================================================
// POST /api/inventory/scan - Process barcode/QR scan
router.post('/scan', (0, auth_1.requireCompanyAccess)(['products.manage']), async (req, res) => {
    try {
        const { barcode, type, productId, quantity } = req.body;
        const performedBy = req.userId;
        const companyId = req.companyId;
        let product;
        let movement;
        if (type === 'product_lookup') {
            // Find product by barcode
            product = await inventory_service_1.InventoryService.getProducts(companyId, { search: barcode }, 1, 0);
            if (product.length > 0) {
                const currentStock = await inventory_service_1.InventoryService.getCurrentStock(product[0].id);
                res.json({
                    product: product[0],
                    currentStock,
                    action: 'lookup'
                });
            }
            else {
                res.status(404).json({ error: 'Product not found' });
            }
        }
        else if (type === 'stock_in') {
            // Record stock in
            movement = await inventory_service_1.InventoryService.recordStockMovement({
                productId,
                type: 'in',
                quantity,
                reference: `Scanned: ${barcode}`,
                reason: 'purchase',
                performedBy
            });
            res.json({ movement, action: 'stock_in' });
        }
        else if (type === 'stock_out') {
            // Record stock out
            movement = await inventory_service_1.InventoryService.recordStockMovement({
                productId,
                type: 'out',
                quantity: -Math.abs(quantity), // Ensure negative for out
                reference: `Scanned: ${barcode}`,
                reason: 'sale',
                performedBy
            });
            res.json({ movement, action: 'stock_out' });
        }
        else {
            res.status(400).json({ error: 'Invalid scan type' });
        }
    }
    catch (error) {
        console.error('Error processing scan:', error);
        res.status(500).json({ error: 'Failed to process scan' });
    }
});
exports.default = router;
//# sourceMappingURL=inventory.js.map