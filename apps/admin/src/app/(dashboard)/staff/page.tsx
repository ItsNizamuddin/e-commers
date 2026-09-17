"use client";

import React, { useState } from "react";
import {
    useGetStaffListQuery,
    useCreateStaffMutation,
    useUpdateStaffRoleMutation,
    useUpdateStaffStatusMutation,
} from "../../../store/api";
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
    Select,
    FormField,
    TableAction,
    TableActionGroup,
    Pagination,
} from "@ecommers/ui";
import {
    ShieldCheck,
    Plus,
    RefreshCw,
    UserCheck,
    UserX,
    CheckCircle2,
    Users,
} from "lucide-react";
import { RequireRole } from "../../../components/auth/require-role";

export default function StaffPage() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const {
        data,
        isLoading: loading,
        isFetching: refreshing,
        error: queryError,
        refetch,
    } = useGetStaffListQuery({ page, limit: pageSize });

    const [createStaff, { isLoading: isCreating }] = useCreateStaffMutation();
    const [updateStaffRole, { isLoading: isUpdatingRole }] = useUpdateStaffRoleMutation();
    const [updateStaffStatus] = useUpdateStaffStatusMutation();

    const staff = data?.items || [];
    const totalPages = data?.pagination?.totalPages || 1;
    const totalItems = data?.pagination?.total || 0;
    const error = queryError
        ? "message" in queryError
            ? (queryError.message as string)
            : "Failed to retrieve staff directory."
        : null;

    // Create Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("ADMIN");

    // Change Role Modal
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
    const [targetRole, setTargetRole] = useState<UserRole>("ADMIN");

    const [notice, setNotice] = useState<string | null>(null);

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createStaff({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password,
                role,
            }).unwrap();
            setIsCreateOpen(false);
            setFirstName("");
            setLastName("");
            setEmail("");
            setPassword("");
            setNotice(`Staff member created successfully.`);
            setTimeout(() => setNotice(null), 3500);
        } catch (err: unknown) {
            if (err && typeof err === "object" && "message" in err) {
                alert(`Error creating staff: ${(err as any).message}`);
            } else {
                alert("Error creating staff.");
            }
        }
    };

    const handleUpdateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            await updateStaffRole({ userId: selectedUser.id, role: targetRole }).unwrap();
            setIsRoleModalOpen(false);
            setNotice(`Role updated to ${targetRole} for ${selectedUser.firstName}`);
            setTimeout(() => setNotice(null), 3500);
        } catch (err: unknown) {
            if (err && typeof err === "object" && "message" in err) {
                alert(`Role update failed: ${(err as any).message}`);
            } else {
                alert("Role update failed.");
            }
        }
    };

    const handleToggleStatus = async (user: UserResponse) => {
        const nextStatus = !user.isActive;
        try {
            await updateStaffStatus({ userId: user.id, isActive: nextStatus }).unwrap();
            setNotice(`Status updated for ${user.firstName}`);
            setTimeout(() => setNotice(null), 3500);
        } catch (err: unknown) {
            if (err && typeof err === "object" && "message" in err) {
                alert(`Failed to update status: ${(err as any).message}`);
            } else {
                alert("Failed to update status.");
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
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <ShieldCheck size={15} />
                            </div>
                            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                Staff Directory & RBAC
                            </h1>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Assign role-based access control permissions, manage operations staff, and control active status.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            isLoading={refreshing}
                            className="gap-1.5"
                        >
                            <RefreshCw size={13} />
                            <span>Refresh</span>
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => setIsCreateOpen(true)}
                            className="gap-1.5"
                        >
                            <Plus size={14} />
                            <span>Add Staff Member</span>
                        </Button>
                    </div>
                </div>

                {notice && (
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs">
                        <CheckCircle2 size={15} />
                        <span>{notice}</span>
                    </div>
                )}

                {/* Controls Bar */}
                <div className="flex items-center justify-between gap-2 px-1">
                    <div className="text-xs text-slate-500 dark:text-neutral-400">
                        Total Staff Accounts: <span className="font-semibold text-slate-900 dark:text-white">{totalItems}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 shrink-0">
                        <span>Show</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            className="text-xs font-medium rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#161616] px-2 py-1 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>entries</span>
                    </div>
                </div>

                {/* Staff Table Card */}
                <Card className="p-0 overflow-hidden flex flex-col border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <Spinner size="md" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Loading staff directory...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6">
                            <ErrorState title="Failed to load staff" message={error} onRetry={() => refetch()} />
                        </div>
                    ) : (
                        <>
                            <Table className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] border-none rounded-none">
                                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
                                    <TableRow>
                                        <TableHead>Staff Member</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staff.length === 0 ? (
                                        <TableRow noHover>
                                            <TableCell colSpan={6} className="text-center py-12">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                        <Users size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                            No staff accounts found
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">
                                                            Assign administrative and operational clearance roles to manage the store.
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => setIsCreateOpen(true)}
                                                        className="mt-2"
                                                    >
                                                        <Plus size={13} />
                                                        <span>Add Staff Member</span>
                                                    </Button>
                                                </div>
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
                                                        <div className="font-bold text-slate-900 dark:text-slate-100">
                                                            {u.firstName} {u.lastName}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 dark:text-neutral-300 text-xs">{u.email}</TableCell>
                                                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={u.isActive ? "success" : "neutral"} size="sm">
                                                            {u.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                                                        {createdStr}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <TableActionGroup>
                                                            <TableAction
                                                                icon={<ShieldCheck size={14} />}
                                                                label="Role"
                                                                onClick={() => {
                                                                    setSelectedUser(u);
                                                                    setTargetRole(u.role);
                                                                    setIsRoleModalOpen(true);
                                                                }}
                                                                title="Change Role"
                                                            />
                                                            <TableAction
                                                                icon={u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                                                                label={u.isActive ? "Deactivate" : "Activate"}
                                                                variant={u.isActive ? "destructive" : "default"}
                                                                onClick={() => handleToggleStatus(u)}
                                                                title={u.isActive ? "Deactivate User" : "Activate User"}
                                                            />
                                                        </TableActionGroup>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>

                            {totalItems > 0 && (
                                <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                                    <Pagination
                                        page={page}
                                        totalPages={totalPages}
                                        totalItems={totalItems}
                                        pageSize={pageSize}
                                        onPageChange={setPage}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </Card>

                {/* Create Staff Modal */}
                <Modal
                    isOpen={isCreateOpen}
                    onClose={() => !isCreating && setIsCreateOpen(false)}
                    title="Add New Staff Account"
                    description="Create administrator or staff credentials for the ecommers backoffice."
                >
                    <form onSubmit={handleCreateStaff} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <Select
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                disabled={isCreating}
                            >
                                <option value="ADMIN">ADMIN (Store Operations & Catalog)</option>
                                <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Authority)</option>
                                <option value="SALES">SALES (Orders, Inventory & Customers)</option>
                                <option value="PUBLISHER">PUBLISHER (Products & Categories)</option>
                                <option value="SUPPORT_AGENT">SUPPORT_AGENT (Customer Service)</option>
                            </Select>
                        </FormField>

                        <div className="flex justify-end gap-2 mt-2">
                            <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" size="sm" isLoading={isCreating} disabled={isCreating}>
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
                    <form onSubmit={handleUpdateRole} className="flex flex-col gap-3.5">
                        <FormField label="New Role Assignment" required>
                            <Select
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value as UserRole)}
                                disabled={isUpdatingRole}
                            >
                                <option value="ADMIN">ADMIN</option>
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                <option value="SALES">SALES</option>
                                <option value="PUBLISHER">PUBLISHER</option>
                                <option value="SUPPORT_AGENT">SUPPORT_AGENT</option>
                            </Select>
                        </FormField>

                        <div className="flex justify-end gap-2 mt-2">
                            <Button type="button" variant="secondary" size="sm" onClick={() => setIsRoleModalOpen(false)} disabled={isUpdatingRole}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingRole} disabled={isUpdatingRole}>
                                Update Role
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </RequireRole>
    );
}
