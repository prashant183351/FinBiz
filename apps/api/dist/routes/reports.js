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
const bullmq_1 = require("bullmq");
const redis_1 = require("redis");
const financial_service_1 = require("../services/financial.service");
const router = (0, express_1.Router)();
const redis = (0, redis_1.createClient)({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const reportQueue = new bullmq_1.Queue('report-calculations', { connection: redis });
// GET /api/reports/profit-loss - Get Profit & Loss statement
router.get('/profit-loss', async (req, res) => {
    try {
        const { companyId, startDate, endDate } = req.query;
        if (!companyId || typeof companyId !== 'string') {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }
        const report = await financial_service_1.FinancialService.getProfitLoss(companyId, new Date(startDate), new Date(endDate));
        res.json(report);
    }
    catch (error) {
        console.error('Error generating P&L report:', error);
        res.status(500).json({ error: 'Failed to generate Profit & Loss report' });
    }
});
// GET /api/reports/balance-sheet - Get Balance Sheet
router.get('/balance-sheet', async (req, res) => {
    try {
        const { companyId, asOfDate } = req.query;
        if (!companyId || typeof companyId !== 'string') {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const date = asOfDate ? new Date(asOfDate) : new Date();
        const report = await financial_service_1.FinancialService.getBalanceSheet(companyId, date);
        res.json(report);
    }
    catch (error) {
        console.error('Error generating balance sheet:', error);
        res.status(500).json({ error: 'Failed to generate Balance Sheet' });
    }
});
// GET /api/reports/cash-flow - Get Cash Flow statement
router.get('/cash-flow', async (req, res) => {
    try {
        const { companyId, startDate, endDate } = req.query;
        if (!companyId || typeof companyId !== 'string') {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }
        const report = await financial_service_1.FinancialService.getCashFlow(companyId, new Date(startDate), new Date(endDate));
        res.json(report);
    }
    catch (error) {
        console.error('Error generating cash flow report:', error);
        res.status(500).json({ error: 'Failed to generate Cash Flow report' });
    }
});
// GET /api/reports/dashboard-summary - Get dashboard summary with key metrics
router.get('/dashboard-summary', async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId || typeof companyId !== 'string') {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        // Get current month P&L
        const monthlyPL = await financial_service_1.FinancialService.getProfitLoss(companyId, startOfMonth, now);
        // Get YTD P&L
        const ytdPL = await financial_service_1.FinancialService.getProfitLoss(companyId, startOfYear, now);
        // Get current balance sheet
        const balanceSheet = await financial_service_1.FinancialService.getBalanceSheet(companyId, now);
        // Get monthly cash flow
        const monthlyCashFlow = await financial_service_1.FinancialService.getCashFlow(companyId, startOfMonth, now);
        const summary = {
            currentMonth: {
                income: monthlyPL.totalIncome,
                expenses: monthlyPL.totalExpenses,
                netProfit: monthlyPL.netProfit,
                cashFlow: monthlyCashFlow.netCashFlow,
            },
            yearToDate: {
                income: ytdPL.totalIncome,
                expenses: ytdPL.totalExpenses,
                netProfit: ytdPL.netProfit,
            },
            balanceSheet: {
                totalAssets: balanceSheet.totalAssets,
                totalLiabilities: balanceSheet.totalLiabilities,
                totalEquity: balanceSheet.totalEquity,
                netWorth: balanceSheet.totalAssets - balanceSheet.totalLiabilities,
            },
            generatedAt: now,
        };
        res.json(summary);
    }
    catch (error) {
        console.error('Error generating dashboard summary:', error);
        res.status(500).json({ error: 'Failed to generate dashboard summary' });
    }
});
// GET /api/reports/top-expenses - Get top expense categories
router.get('/top-expenses', async (req, res) => {
    try {
        const { companyId, limit = 5 } = req.query;
        if (!companyId || typeof companyId !== 'string') {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const topExpenses = await prisma.ledgerEntry.groupBy({
            by: ['account'],
            where: {
                companyId,
                accountType: 'expense',
                date: {
                    gte: startOfMonth,
                    lte: now,
                },
            },
            _sum: {
                debit: true,
            },
            orderBy: {
                _sum: {
                    debit: 'desc',
                },
            },
            take: parseInt(limit),
        });
        const result = topExpenses.map(expense => ({
            category: expense.account,
            amount: expense._sum.debit || 0,
        }));
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching top expenses:', error);
        res.status(500).json({ error: 'Failed to fetch top expenses' });
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map