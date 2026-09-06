"use client";

import React, { useState, useRef, useEffect } from "react";

export interface DropdownItem {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
}

export interface DropdownProps {
    trigger: React.ReactNode;
    items: (DropdownItem | "divider")[];
    align?: "left" | "right";
    className?: string;
}

export function Dropdown({ trigger, items, align = "right", className = "" }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && (
                <div
                    className={`absolute z-50 mt-1.5 w-48 rounded-md border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 ${
                        align === "right" ? "right-0" : "left-0"
                    }`}
                >
                    {items.map((item, index) => {
                        if (item === "divider") {
                            return <div key={index} className="my-1 border-t border-zinc-200 dark:border-zinc-800" />;
                        }

                        return (
                            <button
                                key={index}
                                type="button"
                                disabled={item.disabled}
                                onClick={() => {
                                    if (!item.disabled) {
                                        item.onClick();
                                        setIsOpen(false);
                                    }
                                }}
                                className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs transition-colors ${
                                    item.disabled
                                        ? "opacity-50 cursor-not-allowed"
                                        : item.danger
                                        ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                }`}
                            >
                                {item.icon && <span className="text-current">{item.icon}</span>}
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
