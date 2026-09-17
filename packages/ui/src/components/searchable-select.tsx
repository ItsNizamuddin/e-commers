"use client";

import React, { useState, useRef, useEffect, useMemo, useId } from "react";

export interface SearchableSelectOption {
    value: string;
    label: string;
    subText?: string;
    badge?: string;
    description?: string;
    disabled?: boolean;
}

export interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    clearable?: boolean;
    className?: string;
    pageSize?: number;
    size?: "sm" | "md";
    loading?: boolean;
    onSearchChange?: (search: string) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    id?: string;
}

const sizeClasses = {
    sm: "h-8 text-xs px-3",
    md: "h-10 text-xs px-3.5",
};

export function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = "Select an option...",
    searchPlaceholder = "Search...",
    label,
    error,
    helperText,
    required = false,
    disabled = false,
    clearable = false,
    className = "",
    pageSize = 15,
    size = "md",
    loading = false,
    onSearchChange,
    onLoadMore,
    hasMore = false,
    id,
}: SearchableSelectProps) {
    const generatedId = useId();
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : generatedId);

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [visibleCount, setVisibleCount] = useState(pageSize);
    const [openUpwards, setOpenUpwards] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Selected option lookup
    const selectedOption = useMemo(() => {
        return options.find((opt) => opt.value === value);
    }, [options, value]);

    // Filter options locally based on search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) {
            return options;
        }
        const q = searchQuery.toLowerCase().trim();
        return options.filter((opt) => {
            const matchesLabel = opt.label.toLowerCase().includes(q);
            const matchesSub = opt.subText ? opt.subText.toLowerCase().includes(q) : false;
            const matchesDesc = opt.description ? opt.description.toLowerCase().includes(q) : false;
            const matchesBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
            const matchesVal = opt.value.toLowerCase().includes(q);
            return matchesLabel || matchesSub || matchesDesc || matchesBadge || matchesVal;
        });
    }, [options, searchQuery]);

    // Slice options for infinite scrolling
    const visibleOptions = useMemo(() => {
        return filteredOptions.slice(0, visibleCount);
    }, [filteredOptions, visibleCount]);

    const hasMoreLocal = visibleCount < filteredOptions.length;

    // Handle outside clicks
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    // Auto-focus search input when opened and check viewport placement
    useEffect(() => {
        if (isOpen) {
            setVisibleCount(pageSize);
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                if (spaceBelow < 260 && spaceAbove > spaceBelow) {
                    setOpenUpwards(true);
                } else {
                    setOpenUpwards(false);
                }
            }
            // Delay slightly for render transition
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setSearchQuery("");
            setVisibleCount(pageSize);
            setOpenUpwards(false);
        }
    }, [isOpen, pageSize]);

    // Infinite scroll handler
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollTop + clientHeight >= scrollHeight - 30) {
            if (hasMoreLocal) {
                setVisibleCount((prev) => prev + pageSize);
            }
            if (onLoadMore && hasMore) {
                onLoadMore();
            }
        }
    };

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);
        setVisibleCount(pageSize); // Reset scroll pagination on search
        if (onSearchChange) {
            onSearchChange(val);
        }
    };

    const handleSelect = (optionVal: string) => {
        onChange(optionVal);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
    };

    return (
        <div ref={containerRef} className={`relative flex flex-col w-full text-left ${isOpen ? "z-50" : ""}`}>
            {label && (
                <label
                    htmlFor={selectId}
                    className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1"
                >
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Trigger Button */}
            <div
                id={selectId}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                onKeyDown={(e) => {
                    if (!disabled && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
                        e.preventDefault();
                        setIsOpen(true);
                    }
                }}
                className={`relative flex items-center justify-between w-full rounded-md border font-normal transition-all select-none cursor-pointer outline-none ${
                    sizeClasses[size]
                } ${
                    disabled
                        ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800"
                        : "bg-white dark:bg-[#111111] text-slate-900 dark:text-neutral-100"
                } ${
                    error
                        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : isOpen
                        ? "border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                } ${className}`}
            >
                {/* Current Value Display */}
                <div className="flex items-center justify-between w-full min-w-0 pr-6 gap-2">
                    {selectedOption ? (
                        <>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="truncate font-semibold text-slate-900 dark:text-neutral-100 shrink-0 max-w-[80%]">
                                    {selectedOption.label}
                                </span>
                                {selectedOption.subText && (
                                    <span className="text-[11px] font-mono text-slate-400 dark:text-neutral-500 truncate min-w-0 hidden md:inline">
                                        ({selectedOption.subText})
                                    </span>
                                )}
                            </div>
                            {selectedOption.badge && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 shrink-0 ml-auto mr-1">
                                    {selectedOption.badge}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-slate-400 dark:text-neutral-500 truncate">
                            {placeholder}
                        </span>
                    )}
                </div>

                {/* Right controls: Clear button + Chevron */}
                <div className="absolute right-2.5 flex items-center gap-1">
                    {clearable && selectedOption && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded"
                            title="Clear selection"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                    <svg
                        className={`w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </div>

            {/* Dropdown Popover */}
            {isOpen && (
                <div
                    className={`absolute left-0 right-0 z-50 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121212] shadow-2xl overflow-hidden ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-100 ${
                        openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"
                    }`}
                >
                    {/* Search Input Header - Seamless Command Palette style */}
                    <div className="flex items-center px-3 py-2.5 border-b border-slate-100 dark:border-neutral-800/80 bg-slate-50/50 dark:bg-neutral-900/50">
                        <svg
                            className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 shrink-0 mr-2.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchInput}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (visibleOptions.length > 0) {
                                        const firstValid = visibleOptions.find((o) => !o.disabled);
                                        if (firstValid) handleSelect(firstValid.value);
                                    }
                                }
                            }}
                            placeholder={searchPlaceholder}
                            className="w-full text-xs bg-transparent text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 outline-none border-none p-0 focus:outline-none focus:ring-0"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setVisibleCount(pageSize);
                                    searchInputRef.current?.focus();
                                }}
                                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 shrink-0 ml-1.5"
                            >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Scrollable Options List with Infinite Scrolling */}
                    <div
                        ref={listRef}
                        onScroll={handleScroll}
                        role="listbox"
                        className="max-h-64 overflow-y-auto p-1.5 space-y-1 focus:outline-none [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.300)_transparent] dark:[scrollbar-color:theme(colors.neutral.700)_transparent]"
                    >
                        {loading && visibleOptions.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-400 dark:text-neutral-500">
                                Loading options...
                            </div>
                        ) : visibleOptions.length === 0 ? (
                            <div className="py-6 text-center px-4">
                                <p className="text-xs text-slate-500 dark:text-neutral-400">
                                    No items found matching{" "}
                                    <span className="font-semibold text-slate-800 dark:text-neutral-200">
                                        "{searchQuery}"
                                    </span>
                                </p>
                            </div>
                        ) : (
                            visibleOptions.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        disabled={opt.disabled}
                                        onClick={() => !opt.disabled && handleSelect(opt.value)}
                                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-xs transition-all duration-150 ${
                                            opt.disabled
                                                ? "opacity-50 cursor-not-allowed"
                                                : isSelected
                                                ? "bg-blue-50/90 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold shadow-xs"
                                                : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60"
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold truncate">{opt.label}</span>
                                                {opt.subText && (
                                                    <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500 shrink-0">
                                                        ({opt.subText})
                                                    </span>
                                                )}
                                            </div>
                                            {opt.description && (
                                                <p className="text-[10px] text-slate-400 dark:text-neutral-500 truncate mt-0.5">
                                                    {opt.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {opt.badge && (
                                                <span
                                                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                                        isSelected
                                                            ? "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200"
                                                            : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400"
                                                    }`}
                                                >
                                                    {opt.badge}
                                                </span>
                                            )}
                                            {isSelected && (
                                                <svg
                                                    className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}

                        {/* Infinite scroll status / footer indicator */}
                        {filteredOptions.length > 0 && (
                            <div className="pt-2 pb-1 text-center">
                                {hasMoreLocal || (hasMore && loading) ? (
                                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium">
                                        Showing {visibleOptions.length} of {filteredOptions.length} — Scroll for more...
                                    </span>
                                ) : filteredOptions.length > pageSize ? (
                                    <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                                        ✓ All {filteredOptions.length} items loaded
                                    </span>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error or Helper text */}
            {error ? (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{error}</p>
            ) : helperText ? (
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">{helperText}</p>
            ) : null}
        </div>
    );
}
