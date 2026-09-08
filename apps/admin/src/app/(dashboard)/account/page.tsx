"use client";

import React, { useState } from "react";
import { useAppSelector } from "../../../store";
import {
    User,
    Globe,
    CheckCircle2,
    Check,
} from "lucide-react";
import { Card, Button, Modal, Input, FormField } from "@ecommers/ui";

export default function AccountPage() {
    const user = useAppSelector((state) => state.auth.user);
    const role = useAppSelector((state) => state.auth.role);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [firstName, setFirstName] = useState(user?.firstName || "");
    const [lastName, setLastName] = useState(user?.lastName || "");
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    React.useEffect(() => {
        if (user) {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
        }
    }, [user]);

    const userName = user?.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : "Administrator";
    const emailAddress = user?.email || "admin@ecommers.local";
    const internalUserId = user?.id ? user.id.slice(-6).toUpperCase() : "ADM-01";

    const formattedLastAuth = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    const formattedRegDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
          })
        : "Mar 7, 2026, 5:22 PM";

    const handleSaveInformation = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate immediate update
        setTimeout(() => {
            setIsSaving(false);
            setIsEditModalOpen(false);
            setSuccessMessage("Account information updated successfully.");
            setTimeout(() => setSuccessMessage(null), 3500);
        }, 600);
    };

    return (
        <div className="flex flex-col gap-4">
            {successMessage && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                    <Check size={14} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Main Account Card */}
            <Card className="p-4 sm:p-5">
                {/* Card Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-neutral-800">
                    <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-0.5">
                            <User size={15} />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                Account Information
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Manage your administrator identity and operational profile details.
                            </p>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditModalOpen(true)}
                        className="font-medium"
                    >
                        Edit Information
                    </Button>
                </div>

                {/* Account Details Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
                    <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                            USERNAME
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                            {userName}
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                            EMAIL ADDRESS
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                            {emailAddress}
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                            INTERNAL USER ID
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1 font-mono">
                            {internalUserId}
                        </div>
                    </div>
                </div>

                {/* Lifecycle & Presence Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Globe size={14} className="text-blue-600 dark:text-blue-400" />
                        <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                            Lifecycle & Presence
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Platform status and session telemetry.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Account Status */}
                        <div>
                            <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1.5">
                                ACCOUNT STATUS
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={12} />
                                <span>ACTIVE</span>
                            </span>
                        </div>

                        {/* System Role */}
                        <div>
                            <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1.5">
                                SYSTEM ROLE
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <CheckCircle2 size={12} />
                                <span>{role ? role.replace("_", " ") : "SUPER ADMIN"}</span>
                            </span>
                        </div>

                        {/* Last Authentication */}
                        <div>
                            <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                                LAST AUTHENTICATION
                            </div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                                {formattedLastAuth}
                            </div>
                        </div>

                        {/* Registration Date */}
                        <div>
                            <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                                REGISTRATION DATE
                            </div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                                {formattedRegDate}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Edit Information Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => !isSaving && setIsEditModalOpen(false)}
                title="Edit Account Information"
                description="Update your administrator profile contact details."
            >
                <form onSubmit={handleSaveInformation} className="flex flex-col gap-4">
                    <FormField label="First Name" required>
                        <Input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={isSaving}
                        />
                    </FormField>
                    <FormField label="Last Name" required>
                        <Input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={isSaving}
                        />
                    </FormField>
                    <FormField label="Email Address">
                        <Input value={emailAddress} disabled />
                    </FormField>

                    <div className="flex justify-end gap-2.5 mt-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsEditModalOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isSaving}
                            disabled={isSaving}
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
