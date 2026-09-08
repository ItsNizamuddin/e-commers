# Seller Dashboard UI/UX Design Guidelines

This document serves as the absolute source of truth for the Seller Dashboard's visual aesthetics and layout principles. When building new features or refactoring old ones, **strictly adhere** to these guidelines to maintain a cohesive, Vercel-inspired experience.

## 1. Core Aesthetic (Vibrant & Modern)
- **Minimalist & Clean:** Eliminate unnecessary borders, heavy shadows, and bulky cards.
- **Dynamic Color Usage:** Instead of a strict monochromatic look, utilize your Primary (Brand) and Secondary colors to bring the dashboard to life. Use them for active states, important buttons, badges, and subtle background highlights.
- **Dark Mode Native:** Every component must support dark mode natively using Tailwind's `dark:` classes.
  - *Light Mode Background:* `bg-[#FAFAFA]` or `bg-white`
  - *Dark Mode Background:* `bg-[#0A0A0A]` or `bg-[#111111]`

## 2. Layout & Sizing (Compact by Default)
- **Compact Everything:** Do not use bulky elements. Things should feel tight, dense, and professional.
- **Sidebar (`AppSidebar`):**
  - **Width:** `w-56` (14rem) - Never wider.
  - **Header Height:** `h-14` (not `h-16`).
  - **Behavior:** Fixed to the left on desktop. Completely hidden on smaller screens (`hidden md:flex`).
- **Main App Container:**
  - **Width Constraint:** Use `max-w-5xl` for the main content area to prevent the UI from stretching too wide on `xl` or ultra-wide monitors.
  - **Margins:** `md:ml-56` to account for the fixed sidebar.
- **Top Header (`AppHeader`):**
  - Extremely minimal. Only used for breadcrumbs or page titles.
  - **Height:** `h-14`.

## 3. Navigation & Links
- **Menu Links:**
  - **Size:** `text-[13px]`.
  - **Padding:** Tight paddings (`px-2.5 py-1.5`).
  - **Icons:** Keep Lucide icons small, exactly `size={16}`.
  - **Active State:** Light gray background in light mode (`bg-gray-100`), very dark gray in dark mode (`bg-gray-800`).
- **Section Headers (Menu Labels):**
  - Tiny, uppercase, tracked-out text: `text-[10px] font-semibold uppercase tracking-wider text-gray-400`.

## 4. UI Components & Elements
- **User Profile / Dropdowns:**
  - The trigger should be a compact, slightly rounded square (e.g., `w-6 h-6 rounded-md`) rather than a full circle.
  - Popup menus must be compact: `w-48` width, `text-[13px]` for primary text, `text-[11px]` for secondary text.
  - Inner padding for menus should be minimal (`p-1.5`).
  - Popups from bottom-placed items (like in the sidebar) should open to the right and upwards (`absolute left-full bottom-0 ml-3`).
- **Switches & Toggles:**
  - Theme toggles or binary switches should be custom Tailwind elements (e.g., `h-6 w-10`), using `translate-x-5` for the thumb.
  - Ensure nested icons (like Sun/Moon) are perfectly centered inside the switch thumb using `flex items-center justify-center` (avoid `inline-block` conflicts).
- **Action Buttons & Icons (Lists/Tables):**
  - **Layout:** Use vertically stacked icon + text patterns for dense action groups: `flex flex-col items-center justify-center gap-1`.
  - **Sizing:** Wrap in a tight container (`px-2 py-1.5 rounded-md`). Use exact icon sizes (`size={14}`).
  - **Labels:** Text labels beneath icons must be extremely tiny and tightly spaced (`text-[9px] font-medium leading-none`).
  - **Hover States:** Use subtle primary/secondary color backgrounds (`hover:bg-brand-50 dark:hover:bg-brand-900/20` or `hover:bg-secondary-50`) for standard actions to add life, and specific muted colors for destructive actions (e.g., `hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`).

## 5. Responsiveness
- Assume a desktop-first approach but gracefully degrade.
- **Breakpoints:**
  - `< md`: Hide the sidebar, introduce a hamburger menu (if required) or bottom nav.
  - `>= md`: Show the compact `w-56` sidebar.
  - `>= xl`: Do not scale up element sizes. Let the empty space exist outside the `max-w-5xl` container. *Never* enlarge fonts or paddings just because the screen is bigger.

## Summary Checklist for New Code
- [ ] Are paddings tight? (Avoid `p-6` or `p-8` inside components; prefer `p-3`, `p-4`)
- [ ] Are font sizes appropriately small? (Avoid `text-lg` or `text-xl` unless it's a primary header. Use `text-[13px]` or `text-sm` for standard text).
- [ ] Are icons scaled down? (Use `size={14}` or `size={16}`).
- [ ] Does it look like Vercel?