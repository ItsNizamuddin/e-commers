"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import type { UserResponse, UserRole } from "@ecommers/types";
import {
    Card,
    Badge,
    Spinner,
    ErrorState,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Button,
    Modal,
    Input,
    FormField,
} from "@ecommers/ui";
import {
    ShieldCheck,
    Plus,
    RefreshCw,
    UserCheck,
    UserX,
    Key,
    Lock,
    CheckCircle2,
} from "lucide-react";
import { RequireRole } from "../../../components/auth/require-role";

export default function StaffPage() {
    const [staff, setStaff] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Create Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("ADMIN");
    const [isCreating, setIsCreating] = useState(false);

    // Change Role Modal
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
    const [targetRole, setTargetRole] = useState<UserRole>("ADMIN");
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    const [notice, setNotice] = useState<string | null>(null);

    const fetchStaff = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const res = await api.admin.listStaff({ page: 1, limit: 50 });
            setStaff(res.items || []);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to retrieve staff directory.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await api.admin.createStaff({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password,
                role,
            });
            setIsCreateOpen(false);
            setFirstName("");
            setLastName("");
            setEmail("");
            setPassword("");
            setNotice(`Staff member created successfully.`);
            setTimeout(() => setNotice(null), 3500);
            fetchStaff(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Error creating staff: ${err.message}`);
            }
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setIsUpdatingRole(true);
        try {
            await api.admin.updateStaffRole(selectedUser.id, targetRole);
            setIsRoleModalOpen(false);
            setNotice(`Role updated to ${targetRole} for ${selectedUser.firstName}`);
            setTimeout(() => setNotice(null), 3500);
            fetchStaff(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Role update failed: ${err.message}`);
            }
        } finally {
            setIsUpdatingRole(false);
        }
    };

    const handleToggleStatus = async (user: UserResponse) => {
        const nextStatus = !user.isActive;
        try {
            await api.admin.updateStaffStatus(user.id, nextStatus);
            setNotice(`Status updated for ${user.firstName}`);
            setTimeout(() => setNotice(null), 3500);
            fetchStaff(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Status update failed: ${err.message}`);
            }
        }
    };

    const getRoleBadge = (r: string) => {
        switch (r) {
            case "SUPER_ADMIN":
                return <Badge variant="danger" size="sm">SUPER ADMIN</Badge>;
            case "ADMIN":
                return <Badge variant="primary" size="sm">ADMIN</Badge>;
            case "SALES":
                return <Badge variant="warning" size="sm">SALES</Badge>;
            case "PUBLISHER":
                return <Badge variant="info" size="sm">PUBLISHER</Badge>;
            default:
                return <Badge variant="neutral" size="sm">{r}</Badge>;
        }
    };

    return (
        <RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                            style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#eff6ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#2563eb",
                            }}
                        >
                            <ShieldCheck size={18} />
                        </div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                            Staff Directory & RBAC
                        </h1>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                        Assign role-based access control permissions, manage operations staff, and control active status.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchStaff(true)}
                        isLoading={refreshing}
                        style={{ borderRadius: "8px" }}
                    >
                        <RefreshCw size={14} />
                        <span>Refresh</span>
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setIsCreateOpen(true)}
                        style={{ backgroundColor: "#2563eb", borderRadius: "8px", gap: "0.375rem" }}
                    >
                        <Plus size={15} />
                        <span>Add Staff Member</span>
                    </Button>
                </div>
            </div>

            {notice && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "0.875rem" }}>
                    <CheckCircle2 size={16} />
                    <span>{notice}</span>
                </div>
            )}

            {/* Staff Table Card */}
            <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", gap: "1rem" }}>
                        <Spinner size="md" />
                        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading staff directory...</p>
                    </div>
                ) : error ? (
                    <ErrorState title="Failed to load staff" message={error} onRetry={() => fetchStaff()} />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "3rem 0" }}>
                                        No staff accounts found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                staff.map((u) => {
                                    const createdStr = new Date(u.createdAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    });

                                    return (
                                        <TableRow key={u.id}>
                                            <TableCell>
                                                <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                                    {u.firstName} {u.lastName}
                                                </div>
                                            </TableCell>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>{getRoleBadge(u.role)}</TableCell>
                                            <TableCell>
                                                <Badge variant={u.isActive ? "success" : "neutral"} size="sm">
                                                    {u.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                {createdStr}
                                            </TableCell>
                                            <TableCell style={{ textAlign: "right" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.375rem" }}>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUser(u);
                                                            setTargetRole(u.role);
                                                            setIsRoleModalOpen(true);
                                                        }}
                                                        style={{ borderRadius: "6px", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                                    >
                                                        Role
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleToggleStatus(u)}
                                                        style={{
                                                            borderRadius: "6px",
                                                            fontSize: "0.75rem",
                                                            padding: "0.25rem 0.5rem",
                                                            color: u.isActive ? "#dc2626" : "#16a34a",
                                                        }}
                                                    >
                                                        {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Create Staff Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => !isCreating && setIsCreateOpen(false)}
                title="Add New Staff Account"
                description="Create administrator or staff credentials for the ecommers backoffice."
            >
                <form onSubmit={handleCreateStaff} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <FormField label="First Name" required>
                            <Input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="e.g. Sarah"
                                disabled={isCreating}
                            />
                        </FormField>
                        <FormField label="Last Name" required>
                            <Input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="e.g. Connor"
                                disabled={isCreating}
                            />
                        </FormField>
                    </div>

                    <FormField label="Staff Email" required>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="staff@ecommers.com"
                            disabled={isCreating}
                        />
                    </FormField>

                    <FormField label="Temporary Password" required>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={isCreating}
                        />
                    </FormField>

                    <FormField label="System Role" required>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            disabled={isCreating}
                            style={{
                                width: "100%",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                backgroundColor: "#f8fafc",
                                fontSize: "0.8125rem",
                                color: "#0f172a",
                                outline: "none",
                            }}
                        >
                            <option value="ADMIN">ADMIN (Store Operations & Catalog)</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Authority)</option>
                            <option value="SALES">SALES (Orders, Inventory & Customers)</option>
                            <option value="PUBLISHER">PUBLISHER (Products & Categories)</option>
                            <option value="SUPPORT_AGENT">SUPPORT_AGENT (Customer Service)</option>
                        </select>
                    </FormField>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                        <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" isLoading={isCreating} disabled={isCreating} style={{ backgroundColor: "#2563eb" }}>
                            Create Account
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Change Role Modal */}
            <Modal
                isOpen={isRoleModalOpen}
                onClose={() => !isUpdatingRole && setIsRoleModalOpen(false)}
                title={`Change Role • ${selectedUser?.firstName} ${selectedUser?.lastName}`}
                description="Update role-based permissions and system clearance level."
            >
                <form onSubmit={handleUpdateRole} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <FormField label="New Role Assignment" required>
                        <select
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value as UserRole)}
                            disabled={isUpdatingRole}
                            style={{
                                width: "100%",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                backgroundColor: "#f8fafc",
                                fontSize: "0.8125rem",
                                color: "#0f172a",
                                outline: "none",
                            }}
                        >
                            <option value="ADMIN">ADMIN</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="SALES">SALES</option>
                            <option value="PUBLISHER">PUBLISHER</option>
                            <option value="SUPPORT_AGENT">SUPPORT_AGENT</option>
                        </select>
                    </FormField>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                        <Button type="button" variant="secondary" onClick={() => setIsRoleModalOpen(false)} disabled={isUpdatingRole}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" isLoading={isUpdatingRole} disabled={isUpdatingRole} style={{ backgroundColor: "#2563eb" }}>
                            Update Role
                        </Button>
                    </div>
                </form>
            </Modal>
            </div>
        </RequireRole>
    );
}
