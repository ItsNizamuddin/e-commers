import React from "react";
import { Modal } from "./modal";
import { Button } from "./button";

export interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "primary";
    isLoading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger",
    isLoading = false,
}: ConfirmDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} maxWidth="sm">
            <div className="mt-6 flex justify-end gap-2.5">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
                    {cancelLabel}
                </Button>
                <Button
                    variant={variant === "danger" ? "danger" : "primary"}
                    size="sm"
                    onClick={onConfirm}
                    isLoading={isLoading}
                >
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}
