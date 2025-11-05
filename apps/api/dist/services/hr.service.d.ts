export interface LeaveRequest {
    employeeId: string;
    type: 'casual' | 'sick' | 'earned' | 'maternity' | 'paternity';
    startDate: Date;
    endDate: Date;
    reason?: string;
}
export interface IncentiveData {
    employeeId: string;
    type: 'overtime' | 'bonus' | 'commission' | 'performance';
    amount: number;
    description?: string;
    date: Date;
}
export interface ComplianceData {
    employeeId: string;
    type: 'pf' | 'esi' | 'tds';
    month: number;
    year: number;
    amount: number;
    reference?: string;
    notes?: string;
}
export declare class HRService {
    /**
     * Submit a leave request
     */
    static submitLeaveRequest(request: LeaveRequest, submittedBy: string): Promise<any>;
    /**
     * Approve or reject leave request
     */
    static processLeaveRequest(leaveId: string, action: 'approve' | 'reject', approvedBy: string, notes?: string): Promise<any>;
    /**
     * Get leave requests for an employee or company
     */
    static getLeaveRequests(employeeId?: string, companyId?: string, status?: string, limit?: number, offset?: number): Promise<any[]>;
    /**
     * Add incentive/allowance for employee
     */
    static addIncentive(incentive: IncentiveData, addedBy: string): Promise<any>;
    /**
     * Get incentives for employee or company
     */
    static getIncentives(employeeId?: string, companyId?: string, month?: number, year?: number, processed?: boolean): Promise<any[]>;
    /**
     * Process incentives into payroll
     */
    static processIncentivesForPayroll(employeeId: string, month: number, year: number, processedBy: string): Promise<any[]>;
    /**
     * Submit compliance record (PF/ESI/TDS)
     */
    static submitComplianceRecord(compliance: ComplianceData, submittedBy: string): Promise<any>;
    /**
     * Get compliance records
     */
    static getComplianceRecords(employeeId?: string, companyId?: string, type?: string, month?: number, year?: number, status?: string): Promise<any[]>;
    /**
     * Calculate leave balance for employee
     */
    static getLeaveBalance(employeeId: string): Promise<any>;
    /**
     * Generate payslip data
     */
    static generatePayslipData(employeeId: string, month: number, year: number): Promise<any>;
    /**
     * Get attendance summary for employee
     */
    static getAttendanceSummary(employeeId: string, month: number, year: number): Promise<any>;
}
//# sourceMappingURL=hr.service.d.ts.map