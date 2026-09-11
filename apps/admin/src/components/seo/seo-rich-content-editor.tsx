"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Superscript,
    Subscript,
    Highlighter,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Indent,
    Outdent,
    List,
    ListOrdered,
    Link2,
    Image as ImageIcon,
    Video,
    Scissors,
    Copy,
    ClipboardPaste,
    RotateCcw,
    RotateCw,
    Minus,
    Maximize2,
    Minimize2,
    Eye,
    Code,
    ChevronDown,
    X,
    GripHorizontal,
    FileText,
    PanelBottom,
    Pilcrow,
    Droplet,
    Table as TableIcon,
    CornerDownRight,
    CornerUpLeft,
    Lightbulb,
    Plus,
    Trash2,
} from "lucide-react";
import { Label, Badge } from "@ecommers/ui";

export interface SeoRichContentEditorProps {
    titleLabel?: string;
    sectionType?: "internal" | "bottom";
    badgeText?: string;
    description?: string;
    titleValue: string;
    onTitleChange: (val: string) => void;
    titlePlaceholder?: string;
    contentValue: string;
    onContentChange: (val: string) => void;
    contentPlaceholder?: string;
    isCustomized?: boolean;
    onResetToGlobal?: () => void;
    disabled?: boolean;
    defaultExpanded?: boolean;
    collapsible?: boolean;
}

const PRESET_COLORS = [
    { label: "Default", value: "inherit", bg: "#000000" },
    { label: "Dark Slate", value: "#0f172a", bg: "#0f172a" },
    { label: "Muted Gray", value: "#64748b", bg: "#64748b" },
    { label: "Brand Blue", value: "#2563eb", bg: "#2563eb" },
    { label: "Indigo", value: "#4f46e5", bg: "#4f46e5" },
    { label: "Emerald Green", value: "#16a34a", bg: "#16a34a" },
    { label: "Amber Orange", value: "#d97706", bg: "#d97706" },
    { label: "Crimson Red", value: "#dc2626", bg: "#dc2626" },
    { label: "Purple", value: "#9333ea", bg: "#9333ea" },
    { label: "Teal", value: "#0d9488", bg: "#0d9488" },
];

const PRESET_HIGHLIGHTS = [
    { label: "None", value: "transparent", bg: "transparent" },
    { label: "Yellow", value: "#fef08a", bg: "#fef08a" },
    { label: "Lime Green", value: "#d9f99d", bg: "#d9f99d" },
    { label: "Cyan Blue", value: "#a5f3fc", bg: "#a5f3fc" },
    { label: "Soft Pink", value: "#fbcfe8", bg: "#fbcfe8" },
    { label: "Lavender", value: "#e9d5ff", bg: "#e9d5ff" },
    { label: "Peach", value: "#fed7aa", bg: "#fed7aa" },
];

const SPECIAL_SYMBOLS = [
    "©", "®", "™", "℠", "€", "£", "¥", "₹", "$", "§", "¶",
    "•", "–", "—", "→", "←", "↑", "↓", "✓", "✕", "★",
    "½", "¼", "¾", "±", "°", "µ", "∞", "≠", "≈", "≤", "≥", "✔",
    "⚡", "⭐", "“", "”", "‘", "’", "†", "‡", "•", "⁃",
];

export function SeoRichContentEditor({
    titleLabel = "SEO Rich Content",
    sectionType = "internal",
    badgeText = "Page Body SEO",
    description = "Rich educational or product SEO text block rendered for search bots and user relevance.",
    titleValue,
    onTitleChange,
    titlePlaceholder = "Enter section title",
    contentValue,
    onContentChange,
    contentPlaceholder = "Enter section content (HTML or plain text)",
    isCustomized = false,
    onResetToGlobal,
    disabled = false,
    defaultExpanded = true,
    collapsible = true,
}: SeoRichContentEditorProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [activeTab, setActiveTab] = useState<"visual" | "code">("visual");
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Active popover type
    const [openPopover, setOpenPopover] = useState<
        | "paragraph"
        | "align"
        | "color"
        | "highlight"
        | "clear"
        | "bulletList"
        | "numberedList"
        | "link"
        | "image"
        | "video"
        | "paste"
        | "table"
        | "symbol"
        | "callout"
        | null
    >(null);

    // Dialog & Form states
    const [linkUrl, setLinkUrl] = useState("");
    const [linkText, setLinkText] = useState("");
    const [linkNewTab, setLinkNewTab] = useState(true);

    const [imageUrl, setImageUrl] = useState("");
    const [imageAlt, setImageAlt] = useState("");

    const [videoUrl, setVideoUrl] = useState("");

    // Plain text & HTML paste dialogs
    const [pastePlainText, setPastePlainText] = useState("");
    const [pasteHtmlContent, setPasteHtmlContent] = useState("");
    const [pasteDialogTab, setPasteDialogTab] = useState<"html" | "plain">("html");

    // Toast notification for HTML paste
    const [pasteToast, setPasteToast] = useState<{
        show: boolean;
        plainText: string;
    } | null>(null);

    useEffect(() => {
        if (pasteToast?.show) {
            const timer = setTimeout(() => {
                setPasteToast(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [pasteToast]);

    // Table interactive grid hover state
    const [tableHoverGrid, setTableHoverGrid] = useState<{ rows: number; cols: number }>({ rows: 2, cols: 2 });
    const [isInsideTable, setIsInsideTable] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);
    const sourceRef = useRef<HTMLTextAreaElement>(null);
    const savedRangeRef = useRef<Range | null>(null);

    // Sync contentValue into editorRef when changed externally or when activeTab switches
    useEffect(() => {
        if (editorRef.current && activeTab === "visual") {
            if (editorRef.current.innerHTML !== (contentValue || "")) {
                editorRef.current.innerHTML = contentValue || "";
            }
        }
    }, [contentValue, activeTab]);

    // Handle ESC to exit fullscreen or close popover
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (openPopover) {
                    setOpenPopover(null);
                } else if (isFullscreen) {
                    setIsFullscreen(false);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [openPopover, isFullscreen]);

    // Track if cursor is currently inside a table for contextual controls
    const checkTableContext = useCallback(() => {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode || !editorRef.current) {
            setIsInsideTable(false);
            return null;
        }
        let node: Node | null = sel.anchorNode;
        let cell: HTMLTableCellElement | null = null;
        let row: HTMLTableRowElement | null = null;
        let table: HTMLTableElement | null = null;

        while (node && node !== editorRef.current) {
            if (node.nodeName.toLowerCase() === "td" || node.nodeName.toLowerCase() === "th") {
                cell = node as HTMLTableCellElement;
            } else if (node.nodeName.toLowerCase() === "tr") {
                row = node as HTMLTableRowElement;
            } else if (node.nodeName.toLowerCase() === "table") {
                table = node as HTMLTableElement;
                break;
            }
            node = node.parentNode;
        }

        const inTable = !!(table && row && cell);
        setIsInsideTable(inTable);
        return inTable ? { table: table!, row: row!, cell: cell! } : null;
    }, []);

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0);
        }
        checkTableContext();
    };

    const restoreSelection = () => {
        if (savedRangeRef.current) {
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(savedRangeRef.current);
            }
        }
    };

    const handleEditorInput = () => {
        if (!editorRef.current) return;
        const html = editorRef.current.innerHTML;
        const cleanHtml = html === "<p><br></p>" || html === "<br>" ? "" : html;
        onContentChange(cleanHtml);
        checkTableContext();
    };

    // Seamless tab switch between Visual WYSIWYG and HTML Source Code tabs without losing content
    const handleTabSwitch = (newTab: "visual" | "code") => {
        if (newTab === activeTab) return;

        if (newTab === "code") {
            // Visual -> Code: flush editor's current innerHTML to contentValue before switching
            if (editorRef.current) {
                const html = editorRef.current.innerHTML;
                const cleanHtml = html === "<p><br></p>" || html === "<br>" ? "" : html;
                onContentChange(cleanHtml);
            }
        } else {
            // Code -> Visual: populate editor's innerHTML from current contentValue before displaying visual canvas
            if (editorRef.current) {
                editorRef.current.innerHTML = contentValue || "";
            }
        }
        setActiveTab(newTab);
    };

    const formatDoc = useCallback((cmd: string, val?: string) => {
        if (disabled) return;
        editorRef.current?.focus();
        document.execCommand(cmd, false, val);
        handleEditorInput();
    }, [disabled]);

    // Handle Tab key in visual editor: Indents or outdents list items (creates sublists seamlessly)
    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            if (e.shiftKey) {
                document.execCommand("outdent", false);
            } else {
                document.execCommand("indent", false);
            }
            handleEditorInput();
        }
    };

    // Helper to detect if a string contains HTML markup
    const isHtmlString = (str: string): boolean => {
        const htmlPattern = /<\/?(?:p|div|h[1-6]|ul|ol|li|strong|b|em|i|u|s|a|table|thead|tbody|tr|td|th|span|blockquote|code|pre|br|hr|img|iframe)[^>]*>/i;
        return htmlPattern.test(str);
    };

    // Helper to sanitize pasted HTML (strips script, style, comments, and noisy Word/Office mso styles)
    const sanitizePastedHtml = (rawHtml: string): string => {
        let clean = rawHtml;
        clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
        clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
        clean = clean.replace(/<meta\b[^>]*>/gi, "");
        clean = clean.replace(/<link\b[^>]*>/gi, "");
        clean = clean.replace(/<!--[\s\S]*?-->/g, "");
        clean = clean.replace(/\s*class="[^"]*mso[^"]*"/gi, "");
        clean = clean.replace(/\s*style="[^"]*mso-[^"]*"/gi, "");
        clean = clean.replace(/style="([^"]*)"/gi, (_, styleContent) => {
            const cleanedStyles = styleContent
                .split(";")
                .map((s: string) => s.trim())
                .filter((s: string) => {
                    const lower = s.toLowerCase();
                    return (
                        !lower.startsWith("font-family") &&
                        !lower.startsWith("font-size") &&
                        !lower.startsWith("line-height") &&
                        !lower.startsWith("mso-")
                    );
                })
                .join("; ");
            return cleanedStyles ? `style="${cleanedStyles}"` : "";
        });
        return clean;
    };

    // Handle Paste in visual editor: Detects HTML and renders live elements instead of raw text
    const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const clipboard = e.clipboardData;
        const htmlData = clipboard.getData("text/html");
        const plainText = clipboard.getData("text/plain");

        if (isHtmlString(plainText)) {
            // Raw HTML code pasted directly (e.g. from ChatGPT, VS Code, or SEO generator)
            const clean = sanitizePastedHtml(plainText);
            document.execCommand("insertHTML", false, clean);
            handleEditorInput();
            setPasteToast({ show: true, plainText });
        } else if (htmlData && isHtmlString(htmlData)) {
            // Rich HTML copied from browser page, Word, or Docs
            const clean = sanitizePastedHtml(htmlData);
            document.execCommand("insertHTML", false, clean);
            handleEditorInput();
            setPasteToast({ show: true, plainText });
        } else {
            // Standard plain text: format newlines nicely into paragraphs
            const escaped = plainText
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n\n+/g, "</p><p>")
                .replace(/\n/g, "<br>");
            document.execCommand("insertHTML", false, `<p>${escaped}</p>`);
            handleEditorInput();
        }
    };

    // Undo HTML paste and insert as plain text if user requests
    const handleRevertToPlainText = () => {
        if (!pasteToast?.plainText) return;
        document.execCommand("undo");
        const escaped = pasteToast.plainText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n\n+/g, "</p><p>")
            .replace(/\n/g, "<br>");
        document.execCommand("insertHTML", false, `<p>${escaped}</p>`);
        handleEditorInput();
        setPasteToast(null);
    };

    // Insert formatted HTML from the paste dialog
    const handleInsertFormattedHtml = () => {
        if (!pasteHtmlContent.trim()) return;
        restoreSelection();
        editorRef.current?.focus();
        const clean = sanitizePastedHtml(pasteHtmlContent);
        document.execCommand("insertHTML", false, clean);
        handleEditorInput();
        setPasteHtmlContent("");
        setOpenPopover(null);
    };

    // Format Block (e.g. p, h1, h2, h3, blockquote, pre)
    const handleFormatBlock = (tag: string) => {
        formatDoc("formatBlock", tag);
        setOpenPopover(null);
    };

    // Text Color
    const handleTextColor = (colorHex: string) => {
        formatDoc("foreColor", colorHex);
        setOpenPopover(null);
    };

    // Highlight Background Color
    const handleHighlightColor = (colorHex: string) => {
        formatDoc("hiliteColor", colorHex);
        setOpenPopover(null);
    };

    // Clear Formatting
    const handleClearFormatting = (mode: "all" | "text" | "unlink" | "paragraph") => {
        restoreSelection();
        editorRef.current?.focus();

        if (mode === "all") {
            document.execCommand("removeFormat");
            document.execCommand("unlink");
            document.execCommand("formatBlock", false, "<p>");
        } else if (mode === "text") {
            document.execCommand("removeFormat");
        } else if (mode === "unlink") {
            document.execCommand("unlink");
        } else if (mode === "paragraph") {
            document.execCommand("formatBlock", false, "<p>");
        }

        handleEditorInput();
        setOpenPopover(null);
    };

    // List & Sublist styling
    const handleApplyListStyle = (listType: "ul" | "ol", styleType: string) => {
        restoreSelection();
        editorRef.current?.focus();

        if (listType === "ul") {
            document.execCommand("insertUnorderedList");
        } else {
            document.execCommand("insertOrderedList");
        }

        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
            let node: Node | null = sel.anchorNode;
            while (node && node !== editorRef.current) {
                if (node.nodeName.toLowerCase() === listType) {
                    (node as HTMLElement).style.listStyleType = styleType;
                    break;
                }
                node = node.parentNode;
            }
        }

        handleEditorInput();
        setOpenPopover(null);
    };

    // Indent item to create a nested sublist
    const handleIndentSublist = (styleType?: string) => {
        restoreSelection();
        editorRef.current?.focus();
        document.execCommand("indent");

        if (styleType) {
            const sel = window.getSelection();
            if (sel && sel.anchorNode) {
                let node: Node | null = sel.anchorNode;
                while (node && node !== editorRef.current) {
                    if (node.nodeName.toLowerCase() === "ul" || node.nodeName.toLowerCase() === "ol") {
                        (node as HTMLElement).style.listStyleType = styleType;
                        break;
                    }
                    node = node.parentNode;
                }
            }
        }

        handleEditorInput();
        setOpenPopover(null);
    };

    // Outdent item to promote sublist to parent level
    const handleOutdentSublist = () => {
        restoreSelection();
        editorRef.current?.focus();
        document.execCommand("outdent");
        handleEditorInput();
        setOpenPopover(null);
    };

    // Insert Sublist item directly
    const handleInsertSublistItem = (listType: "ul" | "ol", styleType?: string) => {
        restoreSelection();
        editorRef.current?.focus();

        const sel = window.getSelection();
        let insideLi = false;
        if (sel && sel.anchorNode) {
            let node: Node | null = sel.anchorNode;
            while (node && node !== editorRef.current) {
                if (node.nodeName.toLowerCase() === "li") {
                    insideLi = true;
                    break;
                }
                node = node.parentNode;
            }
        }

        if (insideLi) {
            document.execCommand("indent");
        } else {
            if (listType === "ul") {
                document.execCommand("insertUnorderedList");
            } else {
                document.execCommand("insertOrderedList");
            }
            document.execCommand("indent");
        }

        if (styleType) {
            const currentSel = window.getSelection();
            if (currentSel && currentSel.anchorNode) {
                let node: Node | null = currentSel.anchorNode;
                while (node && node !== editorRef.current) {
                    if (node.nodeName.toLowerCase() === listType) {
                        (node as HTMLElement).style.listStyleType = styleType;
                        break;
                    }
                    node = node.parentNode;
                }
            }
        }

        handleEditorInput();
        setOpenPopover(null);
    };

    // Insert Link
    const handleInsertLink = () => {
        if (!linkUrl.trim()) return;
        restoreSelection();
        editorRef.current?.focus();

        let cleanUrl = linkUrl.trim();
        if (!/^https?:\/\//i.test(cleanUrl) && !cleanUrl.startsWith("/") && !cleanUrl.startsWith("#")) {
            cleanUrl = `https://${cleanUrl}`;
        }

        const sel = window.getSelection();
        const selectedText = sel?.toString();
        const displayText = linkText.trim() || selectedText || cleanUrl;

        const targetAttr = linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : "";
        const linkHtml = `<a href="${cleanUrl}"${targetAttr} class="text-blue-600 underline font-medium">${displayText}</a>`;

        document.execCommand("insertHTML", false, linkHtml);
        handleEditorInput();
        setLinkUrl("");
        setLinkText("");
        setOpenPopover(null);
    };

    // Insert Image
    const handleInsertImage = () => {
        if (!imageUrl.trim()) return;
        restoreSelection();
        editorRef.current?.focus();

        const imgHtml = `<img src="${imageUrl.trim()}" alt="${(imageAlt || "SEO content image").trim()}" class="my-3 max-w-full h-auto rounded-lg border border-slate-200 dark:border-neutral-800" />`;
        document.execCommand("insertHTML", false, imgHtml);
        handleEditorInput();
        setImageUrl("");
        setImageAlt("");
        setOpenPopover(null);
    };

    // Insert Video Embed
    const handleInsertVideo = () => {
        if (!videoUrl.trim()) return;
        restoreSelection();
        editorRef.current?.focus();

        let url = videoUrl.trim();
        let embedUrl = url;

        // Convert YouTube Watch URL to Embed URL
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
        if (ytMatch && ytMatch[1]) {
            embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
        }

        const videoHtml = `
            <div class="my-4 aspect-video w-full overflow-hidden rounded-lg border border-slate-200 dark:border-neutral-800">
                <iframe src="${embedUrl}" class="w-full h-full border-0" allowfullscreen loading="lazy"></iframe>
            </div>
        `;

        document.execCommand("insertHTML", false, videoHtml);
        handleEditorInput();
        setVideoUrl("");
        setOpenPopover(null);
    };

    // Insert Symbol
    const handleInsertSymbol = (sym: string) => {
        restoreSelection();
        editorRef.current?.focus();
        document.execCommand("insertHTML", false, sym);
        handleEditorInput();
        setOpenPopover(null);
    };

    // Table Operations
    const handleInsertTable = (rows: number, cols: number, withHeader: boolean = true) => {
        restoreSelection();
        editorRef.current?.focus();

        let tableHtml = '<table class="seo-table w-full my-4 border-collapse border border-slate-300 dark:border-neutral-700 text-xs text-left">';
        if (withHeader) {
            tableHtml += '<thead><tr class="bg-slate-100 dark:bg-neutral-800">';
            for (let c = 0; c < cols; c++) {
                tableHtml += `<th class="border border-slate-300 dark:border-neutral-700 p-2 font-semibold text-slate-900 dark:text-neutral-100">Header ${c + 1}</th>`;
            }
            tableHtml += '</tr></thead>';
        }
        tableHtml += '<tbody>';
        for (let r = 0; r < rows; r++) {
            tableHtml += `<tr class="${r % 2 === 1 ? 'bg-slate-50/50 dark:bg-neutral-900/30' : ''}">`;
            for (let c = 0; c < cols; c++) {
                tableHtml += '<td class="border border-slate-300 dark:border-neutral-700 p-2 text-slate-800 dark:text-neutral-200">Cell</td>';
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table><p><br></p>';

        document.execCommand("insertHTML", false, tableHtml);
        handleEditorInput();
        setOpenPopover(null);
    };

    const handleTableAction = (action: "addRowBelow" | "addRowAbove" | "addColRight" | "addColLeft" | "deleteRow" | "deleteCol" | "deleteTable") => {
        restoreSelection();
        editorRef.current?.focus();
        const context = checkTableContext();
        if (!context) return;

        const { table, row, cell } = context;

        if (action === "addRowBelow" || action === "addRowAbove") {
            const numCols = row.cells.length;
            const newRow = document.createElement("tr");
            newRow.className = "hover:bg-slate-50/50 dark:hover:bg-neutral-900/30";
            for (let i = 0; i < numCols; i++) {
                const newCell = document.createElement("td");
                newCell.className = "border border-slate-300 dark:border-neutral-700 p-2 text-slate-800 dark:text-neutral-200";
                newCell.innerHTML = "New cell";
                newRow.appendChild(newCell);
            }
            if (action === "addRowBelow") {
                row.parentNode?.insertBefore(newRow, row.nextSibling);
            } else {
                row.parentNode?.insertBefore(newRow, row);
            }
        } else if (action === "addColRight" || action === "addColLeft") {
            const colIndex = cell.cellIndex;
            const insertIndex = action === "addColRight" ? colIndex + 1 : colIndex;
            const allRows = table.rows;
            for (let i = 0; i < allRows.length; i++) {
                const r = allRows[i];
                const isHeader = r.parentElement?.tagName.toLowerCase() === "thead" || r.cells[0]?.tagName.toLowerCase() === "th";
                const newCell = document.createElement(isHeader ? "th" : "td");
                newCell.className = isHeader
                    ? "border border-slate-300 dark:border-neutral-700 p-2 font-semibold text-slate-900 dark:text-neutral-100"
                    : "border border-slate-300 dark:border-neutral-700 p-2 text-slate-800 dark:text-neutral-200";
                newCell.innerHTML = isHeader ? "Header" : "Cell";
                if (insertIndex < r.cells.length) {
                    r.insertBefore(newCell, r.cells[insertIndex]);
                } else {
                    r.appendChild(newCell);
                }
            }
        } else if (action === "deleteRow") {
            if (table.rows.length <= 1) {
                table.remove();
            } else {
                row.remove();
            }
        } else if (action === "deleteCol") {
            const colIndex = cell.cellIndex;
            const allRows = table.rows;
            if (row.cells.length <= 1) {
                table.remove();
            } else {
                for (let i = 0; i < allRows.length; i++) {
                    if (allRows[i].cells[colIndex]) {
                        allRows[i].cells[colIndex].remove();
                    }
                }
            }
        } else if (action === "deleteTable") {
            table.remove();
        }

        handleEditorInput();
        setOpenPopover(null);
    };

    // Insert SEO Callouts & Snippets
    const handleInsertCallout = (type: "info" | "success" | "warning" | "faq") => {
        restoreSelection();
        editorRef.current?.focus();

        if (type === "faq") {
            const faqHtml = `
                <div class="faq-item my-3 p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40">
                    <h4 class="text-xs font-bold text-slate-900 dark:text-neutral-100 mb-1">Frequently Asked Question heading?</h4>
                    <p class="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">Provide an informative, keyword-rich answer here to optimize for Google FAQ snippets.</p>
                </div>
                <p><br></p>
            `;
            document.execCommand("insertHTML", false, faqHtml);
        } else {
            let icon = "💡";
            let title = "Pro Tip";
            let borderClass = "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100";
            if (type === "success") {
                icon = "✓";
                title = "Key Takeaway";
                borderClass = "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100";
            } else if (type === "warning") {
                icon = "⚠️";
                title = "Important Notice";
                borderClass = "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100";
            }

            const html = `
                <div class="callout my-3 p-3.5 border-l-4 rounded-r-lg ${borderClass}">
                    <div class="font-semibold text-xs mb-1 flex items-center gap-1.5">
                        <span>${icon}</span> <span>${title}</span>
                    </div>
                    <p class="text-xs leading-relaxed">Enter your key note, specification, or educational advice here...</p>
                </div>
                <p><br></p>
            `;
            document.execCommand("insertHTML", false, html);
        }

        handleEditorInput();
        setOpenPopover(null);
    };

    // Paste plain text dialog action
    const handleInsertPlainText = () => {
        if (!pastePlainText.trim()) return;
        restoreSelection();
        editorRef.current?.focus();

        const escaped = pastePlainText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n\n+/g, "</p><p>")
            .replace(/\n/g, "<br>");

        document.execCommand("insertHTML", false, `<p>${escaped}</p>`);
        handleEditorInput();
        setPastePlainText("");
        setOpenPopover(null);
    };

    // Clean word and character count
    const plainText = contentValue.replace(/<[^>]*>/g, "").trim();
    const charCount = plainText.length;
    const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

    const isInternal = sectionType === "internal";

    // Helper to suppress tooltips while any popover is active
    const getButtonTitle = (title: string) => (openPopover ? undefined : title);

    return (
        <div
            className={`rounded-xl border transition-all ${
                isFullscreen
                    ? "fixed inset-0 z-50 bg-white dark:bg-neutral-950 p-4 sm:p-6 flex flex-col gap-3 shadow-2xl overflow-y-auto"
                    : isInternal
                    ? "border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 to-transparent dark:from-indigo-950/15"
                    : "border-purple-200/80 dark:border-purple-900/60 bg-gradient-to-b from-purple-50/40 to-transparent dark:from-purple-950/15"
            }`}
        >
            {/* Transparent click-outside backdrop when any popover is open */}
            {openPopover && (
                <div
                    className="fixed inset-0 z-30 bg-transparent"
                    onClick={() => setOpenPopover(null)}
                />
            )}

            {/* Header */}
            <div
                onClick={() => collapsible && !isFullscreen && setIsExpanded(!isExpanded)}
                className={`p-3.5 flex items-center justify-between ${
                    collapsible && !isFullscreen ? "cursor-pointer select-none" : ""
                }`}
            >
                <div className="flex items-center gap-2.5">
                    <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isInternal
                                ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                                : "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                        }`}
                    >
                        {isInternal ? <FileText size={16} /> : <PanelBottom size={16} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-neutral-100">
                                {titleLabel}
                            </h4>
                            <span
                                className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                                    isInternal
                                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                        : "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                }`}
                            >
                                {badgeText}
                            </span>
                            {isCustomized ? (
                                <Badge variant="warning" size="sm" className="text-[9px] px-1.5 py-0">
                                    Customized
                                </Badge>
                            ) : null}
                        </div>
                        {description && (
                            <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isCustomized && onResetToGlobal && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onResetToGlobal();
                            }}
                            className="text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 transition-colors"
                        >
                            <RotateCcw size={10} />
                            <span>Reset to Global</span>
                        </button>
                    )}

                    {collapsible && !isFullscreen && (
                        <span className="text-xs text-slate-400 select-none">
                            {isExpanded ? "▲" : "▼"}
                        </span>
                    )}
                </div>
            </div>

            {/* Content Body */}
            {(isExpanded || isFullscreen) && (
                <div
                    className={`p-3.5 pt-0 border-t border-slate-100 dark:border-neutral-800/80 space-y-3.5 mt-1 ${
                        isFullscreen ? "flex-1 flex flex-col" : ""
                    }`}
                >
                    {/* Section Title Input */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                                Title
                            </Label>
                            <span className="text-[10px] font-mono text-slate-400">
                                {titleValue.length} chars
                            </span>
                        </div>
                        <input
                            type="text"
                            value={titleValue}
                            onChange={(e) => onTitleChange(e.target.value)}
                            placeholder={titlePlaceholder}
                            disabled={disabled}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                        />
                    </div>

                    {/* Section Value / Rich WYSIWYG Editor */}
                    <div className={isFullscreen ? "flex-1 flex flex-col" : ""}>
                        <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                                Value
                            </Label>
                        </div>

                        {/* Editor Outer Container */}
                        <div
                            className={`rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] shadow-xs relative flex flex-col transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 ${
                                isFullscreen ? "flex-1 min-h-[400px]" : ""
                            }`}
                        >
                            {/* Toolbar Row 1: Formatting Actions */}
                            <div className="p-1.5 border-b border-slate-200 dark:border-neutral-800 flex flex-wrap items-center gap-1 bg-slate-50/70 dark:bg-neutral-900/60 select-none">
                                {/* Bold */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Bold (Ctrl+B)")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("bold");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <Bold size={13} className="stroke-[2.5]" />
                                </button>

                                {/* Italic */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Italic (Ctrl+I)")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("italic");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <Italic size={13} />
                                </button>

                                {/* Underline */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Underline (Ctrl+U)")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("underline");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <Underline size={13} />
                                </button>

                                {/* Strikethrough */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Strikethrough")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("strikeThrough");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <Strikethrough size={13} />
                                </button>

                                {/* Superscript */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Superscript")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("superscript");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors text-xs font-semibold"
                                >
                                    <Superscript size={13} />
                                </button>

                                {/* Subscript */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Subscript")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("subscript");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors text-xs font-semibold"
                                >
                                    <Subscript size={13} />
                                </button>

                                <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 mx-0.5" />

                                {/* Text Color Dropdown */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Text Color")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "color" ? null : "color");
                                        }}
                                        disabled={disabled}
                                        className="px-1.5 py-1 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors flex items-center gap-0.5 text-xs font-bold"
                                    >
                                        <span>A</span>
                                        <div className="w-2.5 h-0.5 bg-blue-600 rounded-full" />
                                        <ChevronDown size={10} className="text-slate-400 ml-0.5" />
                                    </button>

                                    {openPopover === "color" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full left-0 mt-1 z-40 w-44 p-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-xl grid grid-cols-5 gap-1.5"
                                        >
                                            {PRESET_COLORS.map((c) => (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    title={c.label}
                                                    onClick={() => handleTextColor(c.value)}
                                                    className="w-6 h-6 rounded-md border border-slate-300 dark:border-neutral-700 hover:scale-110 transition-transform flex items-center justify-center"
                                                    style={{ backgroundColor: c.bg }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Highlight Color Dropdown */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Highlight Color")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "highlight" ? null : "highlight");
                                        }}
                                        disabled={disabled}
                                        className="px-1.5 py-1 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors flex items-center gap-0.5 text-xs font-semibold"
                                    >
                                        <Highlighter size={12} className="text-amber-500" />
                                        <ChevronDown size={10} className="text-slate-400" />
                                    </button>

                                    {openPopover === "highlight" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full left-0 mt-1 z-40 w-40 p-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-xl grid grid-cols-4 gap-1.5"
                                        >
                                            {PRESET_HIGHLIGHTS.map((h) => (
                                                <button
                                                    key={h.value}
                                                    type="button"
                                                    title={h.label}
                                                    onClick={() => handleHighlightColor(h.value)}
                                                    className="w-6 h-6 rounded-md border border-slate-300 dark:border-neutral-700 hover:scale-110 transition-transform"
                                                    style={{ backgroundColor: h.bg }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Clear Formatting (Droplet 💧) */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Clear Formatting")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "clear" ? null : "clear");
                                        }}
                                        disabled={disabled}
                                        className="px-1.5 py-1 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors flex items-center gap-0.5 text-xs"
                                    >
                                        <Droplet size={12} className="text-sky-500 fill-sky-500/20" />
                                        <ChevronDown size={10} className="text-slate-400" />
                                    </button>

                                    {openPopover === "clear" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full left-0 mt-1 z-40 w-48 py-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-xl text-xs"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleClearFormatting("text")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
                                            >
                                                Clear Text Formatting
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleClearFormatting("paragraph")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
                                            >
                                                Reset to Normal Paragraph
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleClearFormatting("unlink")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
                                            >
                                                Remove Hyperlink
                                            </button>
                                            <div className="border-t border-slate-100 dark:border-neutral-800 my-1" />
                                            <button
                                                type="button"
                                                onClick={() => handleClearFormatting("all")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-red-600 dark:text-red-400 font-medium"
                                            >
                                                Clear All Styles & Tags
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 mx-0.5" />

                                {/* Paragraph Formatting Dropdown (¶) */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Paragraph Style")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "paragraph" ? null : "paragraph");
                                        }}
                                        disabled={disabled}
                                        className="px-1.5 py-1 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors flex items-center gap-1 text-xs font-medium"
                                    >
                                        <Pilcrow size={12} />
                                        <ChevronDown size={10} className="text-slate-400" />
                                    </button>

                                    {openPopover === "paragraph" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full left-0 mt-1 z-40 w-44 py-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-xl text-xs"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleFormatBlock("<p>")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
                                            >
                                                Paragraph
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleFormatBlock("<h1>")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-900 dark:text-neutral-100 font-bold text-sm"
                                            >
                                                Heading 1
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleFormatBlock("<h2>")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-900 dark:text-neutral-100 font-bold"
                                            >
                                                Heading 2
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleFormatBlock("<h3>")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-900 dark:text-neutral-100 font-semibold"
                                            >
                                                Heading 3
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleFormatBlock("<h4>")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-900 dark:text-neutral-100 font-medium"
                                            >
                                                Heading 4
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleFormatBlock("<blockquote>")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 italic"
                                            >
                                                Blockquote
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleFormatBlock("<pre>")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 font-mono text-[11px]"
                                            >
                                                Code Block
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Text Align Dropdown */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Text Alignment")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "align" ? null : "align");
                                        }}
                                        disabled={disabled}
                                        className="px-1.5 py-1 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors flex items-center gap-1 text-xs"
                                    >
                                        <AlignLeft size={12} />
                                        <ChevronDown size={10} className="text-slate-400" />
                                    </button>

                                    {openPopover === "align" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full left-0 mt-1 z-40 w-32 py-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-xl"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    formatDoc("justifyLeft");
                                                    setOpenPopover(null);
                                                }}
                                                className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs"
                                            >
                                                <AlignLeft size={12} /> Left
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    formatDoc("justifyCenter");
                                                    setOpenPopover(null);
                                                }}
                                                className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs"
                                            >
                                                <AlignCenter size={12} /> Center
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    formatDoc("justifyRight");
                                                    setOpenPopover(null);
                                                }}
                                                className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs"
                                            >
                                                <AlignRight size={12} /> Right
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    formatDoc("justifyFull");
                                                    setOpenPopover(null);
                                                }}
                                                className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs"
                                            >
                                                <AlignJustify size={12} /> Justify
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Outdent / Indent */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Decrease Indent / Promote Sublist (Shift+Tab)")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("outdent");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <Outdent size={13} />
                                </button>
                                <button
                                    type="button"
                                    title={getButtonTitle("Increase Indent / Create Sublist (Tab)")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("indent");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <Indent size={13} />
                                </button>

                                <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 mx-0.5" />

                                {/* Bulleted List with Sublist Menu (•≡ ⌵) */}
                                <div className="relative flex items-center">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Bulleted List")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            formatDoc("insertUnorderedList");
                                        }}
                                        disabled={disabled}
                                        className="p-1.5 rounded-l hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                    >
                                        <List size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        title={getButtonTitle("Bullet & Sublist Styles")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "bulletList" ? null : "bulletList");
                                        }}
                                        disabled={disabled}
                                        className="p-1 rounded-r hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors"
                                    >
                                        <ChevronDown size={10} />
                                    </button>

                                    {openPopover === "bulletList" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full left-0 mt-1 z-40 w-52 py-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-xl text-xs"
                                        >
                                            <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                                                Bullet Types
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyListStyle("ul", "disc")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 flex items-center gap-2"
                                            >
                                                <span className="text-sm">•</span> Default Bullet (Disc)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyListStyle("ul", "circle")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 flex items-center gap-2"
                                            >
                                                <span className="text-sm">○</span> Circle (Sublist Style)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyListStyle("ul", "square")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 flex items-center gap-2"
                                            >
                                                <span className="text-xs">■</span> Square Bullet
                                            </button>

                                            <div className="border-t border-slate-100 dark:border-neutral-800 my-1" />
                                            <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                                                Sublist Hierarchy
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleIndentSublist()}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-blue-600 dark:text-blue-400 font-medium flex items-center gap-2"
                                            >
                                                <CornerDownRight size={12} /> Indent to Sublist (Tab)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOutdentSublist()}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex items-center gap-2"
                                            >
                                                <CornerUpLeft size={12} /> Promote to Parent (Shift+Tab)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleInsertSublistItem("ul", "circle")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 flex items-center gap-2"
                                            >
                                                <Plus size={12} /> Insert New Sub-bullet
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Numbered List with Sublist Menu (1≡ ⌵) */}
                                <div className="relative flex items-center">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Numbered List")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            formatDoc("insertOrderedList");
                                        }}
                                        disabled={disabled}
                                        className="p-1.5 rounded-l hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                    >
                                        <ListOrdered size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        title={getButtonTitle("Numbering & Sublist Styles")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "numberedList" ? null : "numberedList");
                                        }}
                                        disabled={disabled}
                                        className="p-1 rounded-r hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors"
                                    >
                                        <ChevronDown size={10} />
                                    </button>

                                    {openPopover === "numberedList" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full left-0 mt-1 z-40 w-52 py-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-xl text-xs"
                                        >
                                            <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                                                Numbering Styles
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyListStyle("ol", "decimal")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
                                            >
                                                1, 2, 3... (Decimal Default)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyListStyle("ol", "lower-alpha")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
                                            >
                                                a, b, c... (Lower Alphabet Sublist)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyListStyle("ol", "upper-alpha")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
                                            >
                                                A, B, C... (Upper Alphabet)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyListStyle("ol", "lower-roman")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
                                            >
                                                i, ii, iii... (Lower Roman Sublist)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleApplyListStyle("ol", "upper-roman")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200"
                                            >
                                                I, II, III... (Upper Roman)
                                            </button>

                                            <div className="border-t border-slate-100 dark:border-neutral-800 my-1" />
                                            <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                                                Sublist Hierarchy
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleIndentSublist("lower-alpha")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-blue-600 dark:text-blue-400 font-medium flex items-center gap-2"
                                            >
                                                <CornerDownRight size={12} /> Indent to Sub-step (Tab)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOutdentSublist()}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex items-center gap-2"
                                            >
                                                <CornerUpLeft size={12} /> Promote to Parent (Shift+Tab)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleInsertSublistItem("ol", "lower-alpha")}
                                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 flex items-center gap-2"
                                            >
                                                <Plus size={12} /> Insert New Sub-step
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 mx-0.5" />

                                {/* Link (Anchored to right-0 so it NEVER bleeds off the card edge) */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Insert Link")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "link" ? null : "link");
                                        }}
                                        disabled={disabled}
                                        className={`p-1.5 rounded transition-colors ${
                                            openPopover === "link"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                                                : "hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                                        }`}
                                    >
                                        <Link2 size={13} />
                                    </button>

                                    {openPopover === "link" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full right-0 mt-1.5 z-40 w-80 p-3.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-2xl space-y-3 text-xs"
                                        >
                                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                                                <span className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                                                    <Link2 size={13} className="text-blue-600" />
                                                    Insert Hyperlink
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenPopover(null)}
                                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-medium text-slate-600 dark:text-neutral-400">
                                                    Target URL Address
                                                </label>
                                                <input
                                                    type="url"
                                                    value={linkUrl}
                                                    onChange={(e) => setLinkUrl(e.target.value)}
                                                    placeholder="https://example.com"
                                                    autoFocus
                                                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50/50 dark:bg-neutral-800/50 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 text-xs text-slate-900 dark:text-neutral-100 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-medium text-slate-600 dark:text-neutral-400">
                                                    Link Text (optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={linkText}
                                                    onChange={(e) => setLinkText(e.target.value)}
                                                    placeholder="Display label"
                                                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50/50 dark:bg-neutral-800/50 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 text-xs text-slate-900 dark:text-neutral-100 transition-all"
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-neutral-400 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={linkNewTab}
                                                    onChange={(e) => setLinkNewTab(e.target.checked)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Open link in new tab</span>
                                            </label>
                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenPopover(null)}
                                                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleInsertLink}
                                                    disabled={!linkUrl.trim()}
                                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all"
                                                >
                                                    Insert Link
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Image (Anchored to right-0) */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Insert Image")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "image" ? null : "image");
                                        }}
                                        disabled={disabled}
                                        className={`p-1.5 rounded transition-colors ${
                                            openPopover === "image"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                                                : "hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                                        }`}
                                    >
                                        <ImageIcon size={13} />
                                    </button>

                                    {openPopover === "image" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full right-0 mt-1.5 z-40 w-80 p-3.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-2xl space-y-3 text-xs"
                                        >
                                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                                                <span className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                                                    <ImageIcon size={13} className="text-blue-600" />
                                                    Insert Image
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenPopover(null)}
                                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-medium text-slate-600 dark:text-neutral-400">
                                                    Image Source URL
                                                </label>
                                                <input
                                                    type="url"
                                                    value={imageUrl}
                                                    onChange={(e) => setImageUrl(e.target.value)}
                                                    placeholder="https://example.com/image.jpg"
                                                    autoFocus
                                                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50/50 dark:bg-neutral-800/50 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 text-xs text-slate-900 dark:text-neutral-100 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-medium text-slate-600 dark:text-neutral-400">
                                                    Alt Text (SEO description)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={imageAlt}
                                                    onChange={(e) => setImageAlt(e.target.value)}
                                                    placeholder="Descriptive image summary"
                                                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50/50 dark:bg-neutral-800/50 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 text-xs text-slate-900 dark:text-neutral-100 transition-all"
                                                />
                                            </div>
                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenPopover(null)}
                                                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleInsertImage}
                                                    disabled={!imageUrl.trim()}
                                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all"
                                                >
                                                    Insert Image
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Video (Anchored to right-0) */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Insert Video Embed")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "video" ? null : "video");
                                        }}
                                        disabled={disabled}
                                        className={`p-1.5 rounded transition-colors ${
                                            openPopover === "video"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                                                : "hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                                        }`}
                                    >
                                        <Video size={13} />
                                    </button>

                                    {openPopover === "video" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full right-0 mt-1.5 z-40 w-80 p-3.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-2xl space-y-3 text-xs"
                                        >
                                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                                                <span className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                                                    <Video size={13} className="text-blue-600" />
                                                    Insert Video Embed
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenPopover(null)}
                                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-medium text-slate-600 dark:text-neutral-400">
                                                    YouTube or Video URL
                                                </label>
                                                <input
                                                    type="url"
                                                    value={videoUrl}
                                                    onChange={(e) => setVideoUrl(e.target.value)}
                                                    placeholder="https://www.youtube.com/watch?v=..."
                                                    autoFocus
                                                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50/50 dark:bg-neutral-800/50 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 text-xs text-slate-900 dark:text-neutral-100 transition-all"
                                                />
                                            </div>
                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenPopover(null)}
                                                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleInsertVideo}
                                                    disabled={!videoUrl.trim()}
                                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all"
                                                >
                                                    Insert Video
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 mx-0.5" />

                                {/* Cut */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Cut")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("cut");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <Scissors size={13} />
                                </button>

                                {/* Copy */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Copy")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("copy");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <Copy size={13} />
                                </button>

                                {/* Paste / Plain Text Dropdown (📋 ⌵) (Anchored to right-0) */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Paste Options")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "paste" ? null : "paste");
                                        }}
                                        disabled={disabled}
                                        className={`p-1.5 rounded transition-colors flex items-center gap-0.5 ${
                                            openPopover === "paste"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                                                : "hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                                        }`}
                                    >
                                        <ClipboardPaste size={13} />
                                        <ChevronDown size={10} className="text-slate-400" />
                                    </button>

                                    {openPopover === "paste" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full right-0 mt-1.5 z-40 w-84 p-3.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-2xl space-y-2.5 text-xs"
                                        >
                                            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-neutral-800">
                                                <div className="flex items-center gap-1.5">
                                                    <ClipboardPaste size={13} className="text-blue-600" />
                                                    <div className="flex rounded-md bg-slate-100 dark:bg-neutral-800 p-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPasteDialogTab("html")}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                                                pasteDialogTab === "html"
                                                                    ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-300 shadow-xs"
                                                                    : "text-slate-500 hover:text-slate-800 dark:text-neutral-400"
                                                            }`}
                                                        >
                                                            Paste as HTML
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPasteDialogTab("plain")}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                                                pasteDialogTab === "plain"
                                                                    ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-300 shadow-xs"
                                                                    : "text-slate-500 hover:text-slate-800 dark:text-neutral-400"
                                                            }`}
                                                        >
                                                            Plain Text
                                                        </button>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenPopover(null)}
                                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>

                                            {pasteDialogTab === "html" ? (
                                                <div className="space-y-2">
                                                    <p className="text-[11px] text-slate-500">
                                                        Paste raw HTML code below to render formatted elements (headings, lists, bold):
                                                    </p>
                                                    <textarea
                                                        rows={4}
                                                        value={pasteHtmlContent}
                                                        onChange={(e) => setPasteHtmlContent(e.target.value)}
                                                        placeholder="<p>Paste <strong>HTML</strong> here...</p>"
                                                        autoFocus
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50/50 dark:bg-neutral-800/50 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 font-mono text-[11px] text-slate-900 dark:text-neutral-100 transition-all"
                                                    />
                                                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-neutral-800">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenPopover(null)}
                                                            className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:text-neutral-400"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleInsertFormattedHtml}
                                                            disabled={!pasteHtmlContent.trim()}
                                                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs"
                                                        >
                                                            Insert as HTML
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-[11px] text-slate-500">
                                                        Paste text here to strip foreign formatting and messy tags before inserting:
                                                    </p>
                                                    <textarea
                                                        rows={4}
                                                        value={pastePlainText}
                                                        onChange={(e) => setPastePlainText(e.target.value)}
                                                        placeholder="Paste text here with Ctrl+V..."
                                                        autoFocus
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50/50 dark:bg-neutral-800/50 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 font-mono text-[11px] text-slate-900 dark:text-neutral-100 transition-all"
                                                    />
                                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-neutral-800">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                formatDoc("selectAll");
                                                                setOpenPopover(null);
                                                            }}
                                                            className="text-[11px] text-blue-600 hover:underline font-medium"
                                                        >
                                                            Select All
                                                        </button>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpenPopover(null)}
                                                                className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:text-neutral-400"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleInsertPlainText}
                                                                disabled={!pastePlainText.trim()}
                                                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs"
                                                            >
                                                                Insert Text
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 mx-0.5" />

                                {/* Table Tool (▦ ⌵) (Anchored to right-0) */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Table Tools & Grid")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "table" ? null : "table");
                                        }}
                                        disabled={disabled}
                                        className={`p-1.5 rounded transition-colors flex items-center gap-0.5 ${
                                            isInsideTable
                                                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60"
                                                : openPopover === "table"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                                                : "hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                                        }`}
                                    >
                                        <TableIcon size={13} />
                                        <ChevronDown size={10} className="text-slate-400" />
                                    </button>

                                    {openPopover === "table" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full right-0 mt-1.5 z-40 w-64 p-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-2xl space-y-2.5 text-xs"
                                        >
                                            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-neutral-800">
                                                <span className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                                                    <TableIcon size={13} className="text-blue-600" />
                                                    Insert Table
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-500 font-medium">
                                                    {tableHoverGrid.rows} × {tableHoverGrid.cols}
                                                </span>
                                            </div>

                                            {/* Interactive Grid Picker (5x5) */}
                                            <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-50 dark:bg-neutral-800/50 rounded-lg border border-slate-200/60 dark:border-neutral-700/60 w-fit mx-auto">
                                                {[1, 2, 3, 4, 5].map((r) =>
                                                    [1, 2, 3, 4, 5].map((c) => {
                                                        const isHighlighted = r <= tableHoverGrid.rows && c <= tableHoverGrid.cols;
                                                        return (
                                                            <div
                                                                key={`${r}-${c}`}
                                                                onMouseEnter={() => setTableHoverGrid({ rows: r, cols: c })}
                                                                onClick={() => handleInsertTable(r, c, true)}
                                                                className={`w-5 h-5 rounded-xs border cursor-pointer transition-all ${
                                                                    isHighlighted
                                                                        ? "bg-blue-500 border-blue-600 scale-105"
                                                                        : "bg-white dark:bg-neutral-700 border-slate-300 dark:border-neutral-600 hover:border-blue-400"
                                                                }`}
                                                            />
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {/* Contextual Table Actions if cursor is in table */}
                                            {isInsideTable && (
                                                <div className="border-t border-slate-100 dark:border-neutral-800 pt-2 space-y-1">
                                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                        Active Table Actions
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTableAction("addRowBelow")}
                                                            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-[11px] text-left text-slate-700 dark:text-neutral-300"
                                                        >
                                                            + Row Below
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTableAction("addColRight")}
                                                            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-[11px] text-left text-slate-700 dark:text-neutral-300"
                                                        >
                                                            + Col Right
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTableAction("deleteRow")}
                                                            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-[11px] text-left text-red-600 dark:text-red-400"
                                                        >
                                                            ✕ Delete Row
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTableAction("deleteCol")}
                                                            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-[11px] text-left text-red-600 dark:text-red-400"
                                                        >
                                                            ✕ Delete Col
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTableAction("deleteTable")}
                                                        className="w-full text-left px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5 mt-1"
                                                    >
                                                        <Trash2 size={11} /> Remove Entire Table
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* SEO Callouts & Snippets Dropdown (💡 ⌵) (Anchored to right-0) */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("SEO Callouts & Snippets")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "callout" ? null : "callout");
                                        }}
                                        disabled={disabled}
                                        className={`p-1.5 rounded transition-colors flex items-center gap-0.5 ${
                                            openPopover === "callout"
                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                                                : "hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                                        }`}
                                    >
                                        <Lightbulb size={13} className="text-amber-500" />
                                        <ChevronDown size={10} className="text-slate-400" />
                                    </button>

                                    {openPopover === "callout" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full right-0 mt-1.5 z-40 w-56 py-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-2xl text-xs"
                                        >
                                            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 tracking-wider uppercase border-b border-slate-100 dark:border-neutral-800">
                                                SEO Content Blocks
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleInsertCallout("info")}
                                                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-neutral-800 text-blue-600 dark:text-blue-400 flex items-center gap-2"
                                            >
                                                <span>💡</span> Pro Tip / Key Note Box
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleInsertCallout("success")}
                                                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-neutral-800 text-emerald-600 dark:text-emerald-400 flex items-center gap-2"
                                            >
                                                <span>✓</span> Key Takeaway Box
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleInsertCallout("warning")}
                                                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-neutral-800 text-amber-600 dark:text-amber-400 flex items-center gap-2"
                                            >
                                                <span>⚠️</span> Caution / Important Box
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleInsertCallout("faq")}
                                                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 flex items-center gap-2"
                                            >
                                                <span>❓</span> FAQ Question / Answer Snippet
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 mx-0.5" />

                                {/* Undo */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Undo (Ctrl+Z)")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("undo");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <RotateCcw size={13} />
                                </button>

                                {/* Redo */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Redo (Ctrl+Y)")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("redo");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <RotateCw size={13} />
                                </button>

                                <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 mx-0.5" />

                                {/* Horizontal Rule */}
                                <button
                                    type="button"
                                    title={getButtonTitle("Insert Horizontal Divider")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatDoc("insertHorizontalRule");
                                    }}
                                    disabled={disabled}
                                    className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                >
                                    <Minus size={13} />
                                </button>

                                {/* Symbol Picker (Anchored to right-0) */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        title={getButtonTitle("Insert Special Symbol")}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            saveSelection();
                                            setOpenPopover(openPopover === "symbol" ? null : "symbol");
                                        }}
                                        disabled={disabled}
                                        className="px-2 py-0.5 rounded text-[11px] font-medium hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
                                    >
                                        symbol
                                    </button>

                                    {openPopover === "symbol" && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full right-0 mt-1.5 z-40 w-64 p-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-2xl grid grid-cols-8 gap-1 text-center"
                                        >
                                            {SPECIAL_SYMBOLS.map((sym) => (
                                                <button
                                                    key={sym}
                                                    type="button"
                                                    onClick={() => handleInsertSymbol(sym)}
                                                    className="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-semibold flex items-center justify-center text-slate-800 dark:text-neutral-200"
                                                >
                                                    {sym}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Fullscreen Toggle */}
                                <div className="ml-auto">
                                    <button
                                        type="button"
                                        title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}
                                        onClick={() => setIsFullscreen(!isFullscreen)}
                                        className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 transition-colors"
                                    >
                                        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                                    </button>
                                </div>
                            </div>

                            {/* Toolbar Row 2: Visual vs Source Code Mode Tabs */}
                            <div className="px-2.5 py-1 border-b border-slate-100 dark:border-neutral-800 flex items-center gap-1.5 bg-slate-50/40 dark:bg-neutral-900/30">
                                <button
                                    type="button"
                                    title={getButtonTitle("Visual WYSIWYG Editor")}
                                    onClick={() => handleTabSwitch("visual")}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
                                        activeTab === "visual"
                                            ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-neutral-700"
                                            : "text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                                    }`}
                                >
                                    <Eye size={12} />
                                    <span>Visual</span>
                                </button>
                                <button
                                    type="button"
                                    title={getButtonTitle("HTML Source Code")}
                                    onClick={() => handleTabSwitch("code")}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
                                        activeTab === "code"
                                            ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-neutral-700"
                                            : "text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                                    }`}
                                >
                                    <Code size={12} />
                                    <span>HTML Source</span>
                                </button>
                            </div>

                            {/* Editor Canvas (Visual WYSIWYG) */}
                            <div
                                ref={editorRef}
                                contentEditable={!disabled}
                                onInput={handleEditorInput}
                                onBlur={handleEditorInput}
                                onPaste={handleEditorPaste}
                                onKeyDown={handleEditorKeyDown}
                                onKeyUp={checkTableContext}
                                onClick={checkTableContext}
                                data-placeholder={contentPlaceholder}
                                className={`w-full px-4 py-3.5 outline-none text-slate-900 dark:text-neutral-100 leading-relaxed overflow-y-auto text-xs sm:text-sm font-sans relative ${
                                    activeTab === "visual" ? "block" : "hidden"
                                } ${
                                    isFullscreen ? "flex-1 min-h-[300px]" : "min-h-[190px] max-h-[500px]"
                                } 
                                [&_p]:mb-3 [&_p]:leading-relaxed
                                [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:text-slate-900 dark:[&_h1]:text-white
                                [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:text-slate-900 dark:[&_h2]:text-white
                                [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:text-slate-900 dark:[&_h3]:text-white
                                [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mb-1
                                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-0.5
                                [&_ul_ul]:list-[circle] [&_ul_ul]:pl-5 [&_ul_ul]:my-1
                                [&_ul_ul_ul]:list-[square] [&_ul_ul_ul]:pl-5 [&_ul_ul_ul]:my-1
                                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
                                [&_ol_ol]:list-[lower-alpha] [&_ol_ol]:pl-5 [&_ol_ol]:my-1
                                [&_ol_ol_ol]:list-[lower-roman] [&_ol_ol_ol]:pl-5 [&_ol_ol_ol]:my-1
                                [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 dark:[&_blockquote]:text-neutral-400 [&_blockquote]:my-3
                                [&_pre]:bg-slate-100 dark:[&_pre]:bg-neutral-900 [&_pre]:p-2.5 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-2
                                [&_a]:text-blue-600 [&_a]:underline
                                [&_hr]:my-4 [&_hr]:border-slate-200 dark:[&_hr]:border-neutral-800
                                [&_.seo-table]:w-full [&_.seo-table]:my-3 [&_.seo-table]:border-collapse
                                [&_.seo-table_th]:border [&_.seo-table_th]:border-slate-300 dark:[&_.seo-table_th]:border-neutral-700 [&_.seo-table_th]:p-2 [&_.seo-table_th]:bg-slate-100 dark:[&_.seo-table_th]:bg-neutral-800
                                [&_.seo-table_td]:border [&_.seo-table_td]:border-slate-300 dark:[&_.seo-table_td]:border-neutral-700 [&_.seo-table_td]:p-2
                                empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none`}
                            />

                            {/* Source Code Textarea (HTML Source) */}
                            <textarea
                                ref={sourceRef}
                                rows={isFullscreen ? 20 : 10}
                                value={contentValue}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    onContentChange(val);
                                    if (editorRef.current) {
                                        editorRef.current.innerHTML = val || "";
                                    }
                                }}
                                placeholder={contentPlaceholder}
                                disabled={disabled}
                                className={`w-full px-4 py-3 font-mono text-xs text-slate-900 dark:text-neutral-100 bg-white dark:bg-[#111111] outline-none resize-y leading-relaxed border-none ${
                                    activeTab === "code" ? "block" : "hidden"
                                } ${
                                    isFullscreen ? "flex-1 min-h-[300px]" : "min-h-[190px]"
                                }`}
                            />

                            {/* Status Bar (Bottom) */}
                            <div className="px-3 py-1.5 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-neutral-500 bg-slate-50/50 dark:bg-neutral-900/30 select-none">
                                <div className="flex items-center gap-1 text-slate-400">
                                    <GripHorizontal size={14} className="opacity-60" />
                                </div>
                                <div className="font-mono tracking-wider font-medium">
                                    CHARS: {charCount} WORDS: {wordCount}
                                </div>
                            </div>

                            {/* Floating Toast Notification when HTML is Pasted */}
                            {pasteToast?.show && (
                                <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-neutral-800/95 backdrop-blur-xs text-white text-xs px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700/60 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                                        <span>✨</span> Pasted formatted HTML
                                    </span>
                                    <div className="h-3 w-px bg-slate-700" />
                                    <button
                                        type="button"
                                        onClick={handleRevertToPlainText}
                                        className="text-[11px] font-medium text-slate-300 hover:text-white underline decoration-slate-500 hover:decoration-white transition-colors"
                                    >
                                        Keep Plain Text
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPasteToast(null)}
                                        className="text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800 transition-colors ml-1"
                                    >
                                        <X size={11} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
