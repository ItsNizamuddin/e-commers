"use client";

import React, { useState } from "react";
import { useAppSelector } from "../../../store";
import {
    User,
    Globe,
    CheckCircle2,
    AlertCircle,
    Edit3,
    Check,
    Loader2,
    Shield,
    Key,
    Radio,
} from "lucide-react";
import { Card, Button, Modal, Input, FormField } from "@ecommers/ui";

export default function AccountPage() {
    const user = useAppSelector((state) => state.auth.user);
    const role = useAppSelector((state) => state.auth.role);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [firstName, setFirstName] = useState(user?.firstName || "Nizam");
    const [lastName, setLastName] = useState(user?.lastName || "Uddin");
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const userName = user?.firstName
        ? `${user.firstName} ${user.lastName}`.trim()
        : "Nizam";
    const emailAddress = user?.email || "nizam@kandradigital.com";
    const internalUserId = user?.id ? user.id.slice(-6).toUpperCase() : "11";

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
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {successMessage && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.75rem 1rem",
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        borderRadius: "8px",
                        color: "#065f46",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                    }}
                >
                    <Check size={16} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Reference-Matched Main Card */}
            <Card
                style={{
                    backgroundColor: "var(--ec-surface, #ffffff)",
                    borderRadius: "16px",
                    border: "1px solid var(--ec-border, #e2e8f0)",
                    padding: "2rem",
                    boxShadow: "var(--ec-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.04))",
                }}
            >
                {/* Card Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        paddingBottom: "1.75rem",
                        borderBottom: "1px solid var(--ec-border, #f1f5f9)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <div
                            style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "rgba(37, 99, 235, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#2563eb",
                                marginTop: "2px",
                            }}
                        >
                            <User size={18} />
                        </div>
                        <div>
                            <h1
                                style={{
                                    fontSize: "1.125rem",
                                    fontWeight: 700,
                                    color: "var(--ec-text-primary, #0f172a)",
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                Account information
                            </h1>
                            <p style={{ fontSize: "0.8125rem", color: "var(--ec-text-muted, #64748b)", marginTop: "0.25rem" }}>
                                Manage your personal information and contact details.
                            </p>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditModalOpen(true)}
                        style={{
                            borderRadius: "8px",
                            borderColor: "var(--ec-border, #bfdbfe)",
                            backgroundColor: "var(--ec-bg-subtle, #eff6ff)",
                            color: "var(--ec-primary, #2563eb)",
                            fontWeight: 600,
                            padding: "0.375rem 0.875rem",
                        }}
                    >
                        Edit information
                    </Button>
                </div>

                {/* Account Details Row */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "2rem",
                        padding: "1.75rem 0",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "var(--ec-text-muted, #64748b)",
                                textTransform: "uppercase",
                            }}
                        >
                            USERNAME
                        </div>
                        <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ec-text-primary, #0f172a)", marginTop: "0.375rem" }}>
                            {userName}
                        </div>
                    </div>

                    <div>
                        <div
                            style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "var(--ec-text-muted, #64748b)",
                                textTransform: "uppercase",
                            }}
                        >
                            EMAIL ADDRESS
                        </div>
                        <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ec-text-primary, #0f172a)", marginTop: "0.375rem" }}>
                            {emailAddress}
                        </div>
                    </div>

                    <div>
                        <div
                            style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "var(--ec-text-muted, #64748b)",
                                textTransform: "uppercase",
                            }}
                        >
                            INTERNAL USER ID
                        </div>
                        <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ec-text-primary, #0f172a)", marginTop: "0.375rem" }}>
                            {internalUserId}
                        </div>
                    </div>
                </div>

                {/* Lifecycle & Presence Section */}
                <div style={{ paddingTop: "1.75rem", borderTop: "1px solid var(--ec-border, #f1f5f9)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <Globe size={16} color="#2563eb" />
                        <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ec-text-primary, #0f172a)" }}>
                            Lifecycle & Presence
                        </h2>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--ec-text-muted, #64748b)", marginBottom: "1.5rem" }}>
                        Track your account status and presence within the platform.
                    </p>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "2rem",
                        }}
                    >
                        {/* Account Status */}
                        <div>
                            <div
                                style={{
                                    fontSize: "0.6875rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                    marginBottom: "0.5rem",
                                }}
                            >
                                ACCOUNT STATUS
                            </div>
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.375rem",
                                    padding: "0.25rem 0.625rem",
                                    borderRadius: "9999px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    backgroundColor: "#ecfdf5",
                                    color: "#059669",
                                    border: "1px solid #a7f3d0",
                                }}
                            >
                                <CheckCircle2 size={13} />
                                <span>ACTIVE</span>
                            </span>
                        </div>

                        {/* System Role */}
                        <div>
                            <div
                                style={{
                                    fontSize: "0.6875rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                    marginBottom: "0.5rem",
                                }}
                            >
                                SYSTEM ROLE
                            </div>
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.375rem",
                                    padding: "0.25rem 0.625rem",
                                    borderRadius: "9999px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    backgroundColor: "#eff6ff",
                                    color: "#2563eb",
                                    border: "1px solid #dbeafe",
                                }}
                            >
                                <CheckCircle2 size={13} />
                                <span>{role ? role.replace("_", " ") : "SUPER ADMIN"}</span>
                            </span>
                        </div>

                        {/* Last Authentication */}
                        <div>
                            <div
                                style={{
                                    fontSize: "0.6875rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    color: "var(--ec-text-muted, #64748b)",
                                    textTransform: "uppercase",
                                }}
                            >
                                LAST AUTHENTICATION
                            </div>
                            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ec-text-primary, #0f172a)", marginTop: "0.375rem" }}>
                                {formattedLastAuth}
                            </div>
                        </div>

                        {/* Registration Date */}
                        <div>
                            <div
                                style={{
                                    fontSize: "0.6875rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    color: "var(--ec-text-muted, #64748b)",
                                    textTransform: "uppercase",
                                }}
                            >
                                REGISTRATION DATE
                            </div>
                            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ec-text-primary, #0f172a)", marginTop: "0.375rem" }}>
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
                <form onSubmit={handleSaveInformation} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
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
                            style={{ backgroundColor: "#2563eb" }}
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
