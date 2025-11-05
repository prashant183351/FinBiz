export interface Permission {
    id: string;
    name: string;
    description?: string;
    module: string;
    action: string;
}
export interface RoleWithPermissions {
    id: string;
    name: string;
    description?: string;
    permissions: Permission[];
}
export declare class PermissionsService {
    /**
     * Initialize default permissions and roles
     */
    static initializeDefaultPermissions(): Promise<void>;
    /**
     * Check if user has specific permission
     */
    static hasPermission(userId: string, companyId: string, permission: string): Promise<boolean>;
    /**
     * Check if user has any of the specified permissions
     */
    static hasAnyPermission(userId: string, companyId: string, permissions: string[]): Promise<boolean>;
    /**
     * Check if user has all of the specified permissions
     */
    static hasAllPermissions(userId: string, companyId: string, permissions: string[]): Promise<boolean>;
    /**
     * Get all permissions for a user in a company
     */
    static getUserPermissions(userId: string, companyId: string): Promise<string[]>;
    /**
     * Get role with permissions
     */
    static getRoleWithPermissions(roleId: string): Promise<RoleWithPermissions | null>;
    /**
     * Create or update role with permissions
     */
    static createOrUpdateRole(roleData: {
        name: string;
        description?: string;
    }, permissionNames: string[]): Promise<RoleWithPermissions>;
    /**
     * Get all available permissions
     */
    static getAllPermissions(): Promise<Permission[]>;
    /**
     * Get all roles with their permissions
     */
    static getAllRoles(): Promise<RoleWithPermissions[]>;
    /**
     * Assign role to user in company
     */
    static assignRoleToUser(userId: string, companyId: string, roleId: string): Promise<void>;
    /**
     * Check if user is owner of company
     */
    static isCompanyOwner(userId: string, companyId: string): Promise<boolean>;
    /**
     * Check if user has admin privileges
     */
    static isAdmin(userId: string, companyId: string): Promise<boolean>;
}
//# sourceMappingURL=permissions.service.d.ts.map