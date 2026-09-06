import React, { useEffect } from "react";

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidth = "md",
}: ModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        if (isOpen) {
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const maxWidthMap = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
                onClick={onClose}
            />

            {/* Modal Box */}
            <div
                role="dialog"
                aria-modal="true"
                className={`relative w-full ${maxWidthMap[maxWidth]} rounded-lg border border-zinc-200 bg-white p-6 shadow-xl transition-all dark:border-zinc-800 dark:bg-zinc-900`}
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        {title && (
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 focus:outline-none"
                    >
                        <span className="sr-only">Close</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
}
