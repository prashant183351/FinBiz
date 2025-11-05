"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const hr_service_1 = require("../services/hr.service");
const router = express_1.default.Router();
// Apply authentication and audit logging to all HR routes
router.use(auth_1.authenticateToken);
router.use((0, audit_1.auditLogger)());
// ============================================================================
// LEAVE MANAGEMENT
// ============================================================================
// POST /api/hr/leave - Submit leave request
router.post('/leave', async (req, res) => {
    try {
        const { employeeId, type, startDate, endDate, reason } = req.body;
        const submittedBy = req.userId;
        const leave = await hr_service_1.HRService.submitLeaveRequest({
            employeeId,
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason
        }, submittedBy);
        res.json(leave);
    }
    catch (error) {
        console.error('Error submitting leave request:', error);
        res.status(500).json({ error: 'Failed to submit leave request' });
    }
});
// GET /api/hr/leave - Get leave requests
router.get('/leave', (0, auth_1.requireCompanyAccess)(['employees.view']), async (req, res) => {
    try {
        const { employeeId, status, limit = '50', offset = '0' } = req.query;
        const companyId = req.companyId;
        const leaves = await hr_service_1.HRService.getLeaveRequests(employeeId, companyId, status, parseInt(limit), parseInt(offset));
        res.json(leaves);
    }
    catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
});
// PUT /api/hr/leave/:leaveId/approve - Approve leave request
router.put('/leave/:leaveId/approve', (0, auth_1.requireCompanyAccess)(['employees.manage']), async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { notes } = req.body;
        const approvedBy = req.userId;
        const leave = await hr_service_1.HRService.processLeaveRequest(leaveId, 'approve', approvedBy, notes);
        res.json(leave);
    }
    catch (error) {
        console.error('Error approving leave request:', error);
        res.status(500).json({ error: 'Failed to approve leave request' });
    }
});
// PUT /api/hr/leave/:leaveId/reject - Reject leave request
router.put('/leave/:leaveId/reject', (0, auth_1.requireCompanyAccess)(['employees.manage']), async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { notes } = req.body;
        const approvedBy = req.userId;
        const leave = await hr_service_1.HRService.processLeaveRequest(leaveId, 'reject', approvedBy, notes);
        res.json(leave);
    }
    catch (error) {
        console.error('Error rejecting leave request:', error);
        res.status(500).json({ error: 'Failed to reject leave request' });
    }
});
// GET /api/hr/leave/balance/:employeeId - Get leave balance
router.get('/leave/balance/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const balance = await hr_service_1.HRService.getLeaveBalance(employeeId);
        res.json(balance);
    }
    catch (error) {
        console.error('Error fetching leave balance:', error);
        res.status(500).json({ error: 'Failed to fetch leave balance' });
    }
});
// ============================================================================
// INCENTIVES MANAGEMENT
// ============================================================================
// POST /api/hr/incentives - Add incentive
router.post('/incentives', (0, auth_1.requireCompanyAccess)(['payroll.manage']), async (req, res) => {
    try {
        const { employeeId, type, amount, description, date } = req.body;
        const addedBy = req.userId;
        const incentive = await hr_service_1.HRService.addIncentive({
            employeeId,
            type,
            amount,
            description,
            date: new Date(date)
        }, addedBy);
        res.json(incentive);
    }
    catch (error) {
        console.error('Error adding incentive:', error);
        res.status(500).json({ error: 'Failed to add incentive' });
    }
});
// GET /api/hr/incentives - Get incentives
router.get('/incentives', (0, auth_1.requireCompanyAccess)(['payroll.view']), async (req, res) => {
    try {
        const { employeeId, month, year, processed, limit = '50', offset = '0' } = req.query;
        const companyId = req.companyId;
        const incentives = await hr_service_1.HRService.getIncentives(employeeId, companyId, month ? parseInt(month) : undefined, year ? parseInt(year) : undefined, processed === 'true' ? true : processed === 'false' ? false : undefined);
        res.json(incentives);
    }
    catch (error) {
        console.error('Error fetching incentives:', error);
        res.status(500).json({ error: 'Failed to fetch incentives' });
    }
});
// POST /api/hr/incentives/process/:employeeId/:month/:year - Process incentives for payroll
router.post('/incentives/process/:employeeId/:month/:year', (0, auth_1.requireCompanyAccess)(['payroll.manage']), async (req, res) => {
    try {
        const { employeeId, month, year } = req.params;
        const processedBy = req.userId;
        const incentives = await hr_service_1.HRService.processIncentivesForPayroll(employeeId, parseInt(month), parseInt(year), processedBy);
        res.json(incentives);
    }
    catch (error) {
        console.error('Error processing incentives:', error);
        res.status(500).json({ error: 'Failed to process incentives' });
    }
});
// ============================================================================
// COMPLIANCE MANAGEMENT
// ============================================================================
// POST /api/hr/compliance - Submit compliance record
router.post('/compliance', (0, auth_1.requireCompanyAccess)(['payroll.manage']), async (req, res) => {
    try {
        const { employeeId, type, month, year, amount, reference, notes } = req.body;
        const submittedBy = req.userId;
        const record = await hr_service_1.HRService.submitComplianceRecord({
            employeeId,
            type,
            month,
            year,
            amount,
            reference,
            notes
        }, submittedBy);
        res.json(record);
    }
    catch (error) {
        console.error('Error submitting compliance record:', error);
        res.status(500).json({ error: 'Failed to submit compliance record' });
    }
});
// GET /api/hr/compliance - Get compliance records
router.get('/compliance', (0, auth_1.requireCompanyAccess)(['payroll.view']), async (req, res) => {
    try {
        const { employeeId, type, month, year, status, limit = '50', offset = '0' } = req.query;
        const companyId = req.companyId;
        const records = await hr_service_1.HRService.getComplianceRecords(employeeId, companyId, type, month ? parseInt(month) : undefined, year ? parseInt(year) : undefined, status);
        res.json(records);
    }
    catch (error) {
        console.error('Error fetching compliance records:', error);
        res.status(500).json({ error: 'Failed to fetch compliance records' });
    }
});
// ============================================================================
// PAYSLIP GENERATION
// ============================================================================
// GET /api/hr/payslip/:employeeId/:month/:year - Generate payslip data
router.get('/payslip/:employeeId/:month/:year', async (req, res) => {
    try {
        const { employeeId, month, year } = req.params;
        const payslip = await hr_service_1.HRService.generatePayslipData(employeeId, parseInt(month), parseInt(year));
        res.json(payslip);
    }
    catch (error) {
        console.error('Error generating payslip:', error);
        res.status(500).json({ error: 'Failed to generate payslip' });
    }
});
// ============================================================================
// ATTENDANCE SUMMARY
// ============================================================================
// GET /api/hr/attendance/summary/:employeeId/:month/:year - Get attendance summary
router.get('/attendance/summary/:employeeId/:month/:year', async (req, res) => {
    try {
        const { employeeId, month, year } = req.params;
        const summary = await hr_service_1.HRService.getAttendanceSummary(employeeId, parseInt(month), parseInt(year));
        res.json(summary);
    }
    catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
});
exports.default = router;
//# sourceMappingURL=hr.js.map