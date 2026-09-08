import React from "react";

export interface TableActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    label: string;
    variant?: "default" | "primary" | "destructive";
}

const variantClasses = {
    default:
        "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800",
    primary:
        "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300",
    destructive:
        "text-slate-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40",
};

export const TableAction = React.forwardRef<HTMLButtonElement, TableActionProps>(
    ({ icon, label, variant = "default", className = "", disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                type="button"
                disabled={disabled}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-md transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    variantClasses[variant]
                } ${className}`}
                {...props}
            >
                <span className="shrink-0 flex items-center justify-center [&_svg]:size-[14px]">{icon}</span>
                <span className="text-[9px] font-medium leading-none whitespace-nowrap">{label}</span>
            </button>
        );
    }
);

TableAction.displayName = "TableAction";

export function TableActionGroup({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`flex items-center justify-end gap-1 ${className}`}>
            {children}
        </div>
    );
}
