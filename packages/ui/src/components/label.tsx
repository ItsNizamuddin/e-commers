import React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    required?: boolean;
    helperText?: string;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
    ({ children, required = false, helperText, className = "", ...props }, ref) => {
        return (
            <label
                ref={ref}
                className={`flex items-center text-xs font-semibold text-slate-700 dark:text-neutral-300 select-none ${className}`}
                {...props}
            >
                <span>{children}</span>
                {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                {helperText && (
                    <span className="text-[11px] font-normal text-slate-400 dark:text-neutral-500 ml-1.5">
                        ({helperText})
                    </span>
                )}
            </label>
        );
    }
);

Label.displayName = "Label";
