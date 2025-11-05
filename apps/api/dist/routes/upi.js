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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const financial_service_1 = require("../services/financial.service");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// POST /api/upi/webhook - UPI Payment Gateway Webhook
router.post('/webhook', async (req, res) => {
    try {
        const { companyId, upiId, amount, description, transactionId, paymentMethod = 'upi', timestamp, status, metadata } = req.body;
        // Only process successful transactions
        if (status !== 'success' && status !== 'SUCCESS') {
            return res.status(200).json({ message: 'Transaction not successful, ignored' });
        }
        if (!companyId || !amount || !transactionId) {
            return res.status(400).json({
                error: 'Company ID, amount, and transaction ID are required'
            });
        }
        // Check if transaction already exists to prevent duplicates
        const existingTransaction = await prisma.transaction.findFirst({
            where: {
                companyId,
                reference: transactionId,
                source: 'upi'
            }
        });
        if (existingTransaction) {
            return res.status(200).json({ message: 'Transaction already processed' });
        }
        // Determine transaction type based on amount (positive = income, negative = expense)
        const transactionAmount = Math.abs(parseFloat(amount));
        const transactionType = parseFloat(amount) > 0 ? 'income' : 'expense';
        const transactionData = {
            companyId,
            type: transactionType,
            amount: transactionAmount,
            description: description || `UPI Transaction ${transactionId}`,
            category: transactionType === 'expense' ? await financial_service_1.FinancialService.categorizeExpense(description || '', transactionAmount) : 'Sales Revenue',
            paymentMethod,
            reference: transactionId,
            vendor: upiId,
            date: timestamp ? new Date(timestamp) : new Date(),
            source: 'upi',
            metadata: {
                ...metadata,
                upiId,
                gatewayTransactionId: transactionId,
            }
        };
        const { transaction, ledgerEntries } = await financial_service_1.FinancialService.createTransactionWithLedger(transactionData);
        // Trigger background report recalculation
        const { Queue } = await Promise.resolve().then(() => __importStar(require('bullmq')));
        const { createClient } = await Promise.resolve().then(() => __importStar(require('redis')));
        const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        const reportQueue = new Queue('report-calculations', { connection: redis });
        await reportQueue.add('upi-transaction-update', {
            companyId,
            reportType: 'dashboard_summary',
        });
        console.log(`✅ UPI Transaction processed: ${transactionId} - ₹${transactionAmount}`);
        res.status(200).json({
            message: 'UPI transaction processed successfully',
            transactionId: transaction.id,
            ledgerEntriesCount: ledgerEntries.length
        });
    }
    catch (error) {
        console.error('Error processing UPI webhook:', error);
        res.status(500).json({ error: 'Failed to process UPI transaction' });
    }
});
// POST /api/upi/bank-import - Import bank statement transactions
router.post('/bank-import', async (req, res) => {
    try {
        const { companyId, transactions } = req.body;
        if (!companyId || !Array.isArray(transactions)) {
            return res.status(400).json({
                error: 'Company ID and transactions array are required'
            });
        }
        const processedTransactions = [];
        const errors = [];
        for (const bankTxn of transactions) {
            try {
                const { date, description, amount, reference, type = 'income' // or 'expense' based on amount sign
                 } = bankTxn;
                // Check for duplicates
                const existing = await prisma.transaction.findFirst({
                    where: {
                        companyId,
                        reference,
                        source: 'bank_import'
                    }
                });
                if (existing)
                    continue;
                const transactionAmount = Math.abs(parseFloat(amount));
                const transactionType = parseFloat(amount) > 0 ? 'income' : 'expense';
                const transactionData = {
                    companyId,
                    type: transactionType,
                    amount: transactionAmount,
                    description: description || `Bank Transaction ${reference}`,
                    category: transactionType === 'expense' ? await financial_service_1.FinancialService.categorizeExpense(description || '', transactionAmount) : 'Sales Revenue',
                    paymentMethod: 'bank',
                    reference,
                    date: new Date(date),
                    source: 'bank_import',
                    metadata: bankTxn
                };
                const { transaction, ledgerEntries } = await financial_service_1.FinancialService.createTransactionWithLedger(transactionData);
                processedTransactions.push({ transaction, ledgerEntries });
            }
            catch (err) {
                errors.push({ transaction: bankTxn, error: err.message });
            }
        }
        // Trigger dashboard update
        const { Queue } = await Promise.resolve().then(() => __importStar(require('bullmq')));
        const { createClient } = await Promise.resolve().then(() => __importStar(require('redis')));
        const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        const reportQueue = new Queue('report-calculations', { connection: redis });
        await reportQueue.add('bank-import-update', {
            companyId,
            reportType: 'dashboard_summary',
        });
        res.status(200).json({
            message: `Processed ${processedTransactions.length} transactions`,
            processed: processedTransactions.length,
            errors: errors.length,
            errorDetails: errors.slice(0, 10) // Limit error details
        });
    }
    catch (error) {
        console.error('Error importing bank transactions:', error);
        res.status(500).json({ error: 'Failed to import bank transactions' });
    }
});
// GET /api/upi/transactions - Get UPI transactions for a company
router.get('/transactions', async (req, res) => {
    try {
        const { companyId, limit = 50 } = req.query;
        if (!companyId || typeof companyId !== 'string') {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const transactions = await prisma.transaction.findMany({
            where: {
                companyId,
                source: 'upi'
            },
            include: {
                ledgerEntries: true,
            },
            orderBy: { date: 'desc' },
            take: parseInt(limit)
        });
        res.json(transactions);
    }
    catch (error) {
        console.error('Error fetching UPI transactions:', error);
        res.status(500).json({ error: 'Failed to fetch UPI transactions' });
    }
});
exports.default = router;
//# sourceMappingURL=upi.js.map