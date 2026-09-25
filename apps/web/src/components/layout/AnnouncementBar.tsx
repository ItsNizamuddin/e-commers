import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export function AnnouncementBar() {
    return (
        <aside aria-label="Store announcement" className="bg-emerald-950 text-emerald-100 text-xs py-2 px-4 border-b border-emerald-900/50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded-full text-[11px]">
                        <Sparkles size={12} /> Farm-to-Fork
                    </span>
                    <span className="hidden sm:inline text-emerald-200">
                        100% Lab-Verified & Traceable Organic Harvest. Free shipping on orders over ₹499!
                    </span>
                    <span className="sm:hidden text-emerald-200">
                        Free shipping on orders over ₹499!
                    </span>
                </div>
                <Link
                    href="/verify-batch"
                    className="inline-flex items-center gap-1 font-medium text-emerald-300 hover:text-white transition-colors text-[11px] underline underline-offset-2 shrink-0 ml-2"
                >
                    <span>Verify Your Batch</span>
                    <ArrowRight size={12} />
                </Link>
            </div>
        </aside>
    );
}
