"use client";

import React, { useState, useEffect } from "react";
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
    requireTypedConfirmation?: boolean;
    confirmationPrompt?: React.ReactNode;
    confirmationExpectedText?: string | string[];
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
    requireTypedConfirmation = false,
    confirmationPrompt,
    confirmationExpectedText = "DELETE",
}: ConfirmDialogProps) {
    const [typedText, setTypedText] = useState("");

    useEffect(() => {
        if (isOpen) {
            setTypedText("");
        }
    }, [isOpen]);

    const expectedArray = Array.isArray(confirmationExpectedText)
        ? confirmationExpectedText
        : [confirmationExpectedText];

    const isMatch =
        !requireTypedConfirmation ||
        expectedArray.some(
            (val) => val.trim().toLowerCase() === typedText.trim().toLowerCase()
        );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isMatch && !isLoading) {
            onConfirm();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} maxWidth="sm">
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {requireTypedConfirmation && (
                    <div className="space-y-1.5 pt-1">
                        <label className="text-xs text-slate-600 dark:text-neutral-300 block">
                            {confirmationPrompt || (
                                <span>
                                    Please type{" "}
                                    <strong className="font-semibold text-red-600 dark:text-red-400 font-mono">
                                        &quot;{expectedArray[0]}&quot;
                                    </strong>{" "}
                                    to confirm:
                                </span>
                            )}
                        </label>
                        <input
                            type="text"
                            value={typedText}
                            onChange={(e) => setTypedText(e.target.value)}
                            placeholder={`Type "${expectedArray[0]}"`}
                            disabled={isLoading}
                            autoFocus
                            className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                    </div>
                )}
                <div className="flex justify-end gap-2.5 pt-1">
                    <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === "danger" ? "danger" : "primary"}
                        size="sm"
                        type="submit"
                        disabled={!isMatch || isLoading}
                        isLoading={isLoading}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
