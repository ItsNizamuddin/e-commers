import React from "react";

export function Table({
    className = "",
    children,
    style,
    ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
    return (
        <div
            className={`relative w-full overflow-x-auto rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-[#111111] ${className}`}
            style={style}
        >
            <table
                className="w-full text-left text-xs border-collapse"
                {...props}
            >
                {children}
            </table>
        </div>
    );
}

export function TableHeader({
    className = "",
    children,
    style,
    ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <thead
            className={`bg-slate-50/70 dark:bg-neutral-900/60 border-b border-slate-200/80 dark:border-neutral-800 [&_tr]:hover:bg-transparent [&_tr]:bg-transparent ${className}`}
            style={style}
            {...props}
        >
            {children}
        </thead>
    );
}

export function TableBody({
    className = "",
    children,
    style,
    ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <tbody
            className={`bg-white dark:bg-[#111111] text-slate-900 dark:text-neutral-100 divide-y divide-slate-100 dark:divide-neutral-800/60 ${className}`}
            style={style}
            {...props}
        >
            {children}
        </tbody>
    );
}

export function TableRow({
    className = "",
    children,
    style,
    noHover = false,
    ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { noHover?: boolean }) {
    return (
        <tr
            className={`border-b border-slate-100 dark:border-neutral-800/60 transition-colors ${
                noHover
                    ? "hover:bg-transparent"
                    : "hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 has-[td[colspan]]:hover:bg-transparent"
            } ${className}`}
            style={style}
            {...props}
        >
            {children}
        </tr>
    );
}

export function TableHead({
    className = "",
    children,
    style,
    ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
    return (
        <th
            className={`h-8 px-3 py-1.5 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500 select-none whitespace-nowrap ${className}`}
            style={style}
            {...props}
        >
            {children}
        </th>
    );
}

export function TableCell({
    className = "",
    children,
    style,
    ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return (
        <td
            className={`px-3 py-2 align-middle text-slate-800 dark:text-neutral-200 text-[13px] ${className}`}
            style={style}
            {...props}
        >
            {children}
        </td>
    );
}
