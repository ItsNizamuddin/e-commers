import React from "react";

export function Table({ className = "", children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
    return (
        <div className="relative w-full overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className={`w-full caption-bottom text-sm ${className}`} {...props}>
                {children}
            </table>
        </div>
    );
}

export function TableHeader({ className = "", children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <thead className={`border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-800 dark:bg-zinc-900/50 ${className}`} {...props}>
            {children}
        </thead>
    );
}

export function TableBody({ className = "", children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <tbody className={`divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950 ${className}`} {...props}>
            {children}
        </tbody>
    );
}

export function TableRow({ className = "", children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr
            className={`transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 ${className}`}
            {...props}
        >
            {children}
        </tr>
    );
}

export function TableHead({ className = "", children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
    return (
        <th
            className={`h-9 px-3.5 text-left align-middle text-xs font-semibold text-zinc-600 dark:text-zinc-400 select-none ${className}`}
            {...props}
        >
            {children}
        </th>
    );
}

export function TableCell({ className = "", children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return (
        <td className={`p-3.5 align-middle text-zinc-900 dark:text-zinc-100 ${className}`} {...props}>
            {children}
        </td>
    );
}
