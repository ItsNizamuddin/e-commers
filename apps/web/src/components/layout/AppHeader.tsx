"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ShoppingBag,
    Search,
    User,
    Menu,
    X,
    QrCode,
    Leaf,
    LogIn,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { toggleCart } from "../../store/cart-slice";

export function AppHeader() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { cart } = useAppSelector((state) => state.cart);
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);

    const [searchQuery, setSearchQuery] = useState("");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const itemCount = cart?.summary?.itemCount ?? 0;

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setMobileMenuOpen(false);
        }
    };

    return (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 gap-4">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:bg-emerald-700 transition-colors">
                                <Leaf size={20} className="stroke-[2.5]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-lg leading-tight tracking-tight text-zinc-900">
                                    ECOMMERS
                                </span>
                                <span className="text-[10px] font-medium tracking-widest uppercase text-emerald-600">
                                    Farm to Fork
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Navigation Links */}
                        <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium text-zinc-600">
                            <Link
                                href="/products"
                                className="px-3 py-1.5 rounded-lg hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                            >
                                Shop All
                            </Link>
                            <Link
                                href="/categories"
                                className="px-3 py-1.5 rounded-lg hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                            >
                                Categories
                            </Link>
                            <Link
                                href="/verify-batch"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold transition-colors"
                            >
                                <QrCode size={14} />
                                <span>Verify Batch</span>
                            </Link>
                        </nav>
                    </div>

                    {/* Search Input Bar (Desktop) */}
                    <form
                        onSubmit={handleSearchSubmit}
                        className="hidden lg:flex flex-1 max-w-md mx-4 relative items-center"
                    >
                        <Search
                            size={16}
                            className="absolute left-3.5 text-zinc-400 pointer-events-none"
                        />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search artisan flours, cold-pressed oils, preserves..."
                            className="w-full bg-zinc-100/80 hover:bg-zinc-100 focus:bg-white text-zinc-900 pl-10 pr-4 py-2 rounded-xl text-sm border border-transparent focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-400"
                        />
                    </form>

                    {/* Right Action Icons */}
                    <div className="flex items-center gap-2">
                        {/* Mobile Search Toggle Trigger */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                            aria-label="Toggle navigation menu"
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Search size={20} />}
                        </button>

                        {/* Customer Account Button */}
                        {isAuthenticated && user ? (
                            <Link
                                href="/account"
                                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200 transition-colors"
                            >
                                <User size={16} className="text-zinc-500" />
                                <span className="max-w-[100px] truncate">{user.firstName}</span>
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200 transition-colors"
                            >
                                <LogIn size={15} className="text-zinc-500" />
                                <span>Sign In</span>
                            </Link>
                        )}

                        {/* Slide-out Cart Button */}
                        <button
                            onClick={() => dispatch(toggleCart())}
                            className="relative flex items-center justify-center p-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-sm active:scale-95"
                            aria-label="Shopping Cart"
                        >
                            <ShoppingBag size={18} />
                            {itemCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-emerald-500 text-white font-bold text-[11px] rounded-full flex items-center justify-center ring-2 ring-white animate-in zoom-in-50">
                                    {itemCount > 99 ? "99+" : itemCount}
                                </span>
                            )}
                        </button>

                        {/* Mobile Menu Hamburger */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
                            aria-label="Open mobile menu"
                        >
                            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-zinc-200 space-y-3 animate-in slide-in-from-top-2 duration-200">
                        {/* Mobile Search Form */}
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <Search
                                size={16}
                                className="absolute left-3.5 top-3 text-zinc-400 pointer-events-none"
                            />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products, ingredients..."
                                className="w-full bg-zinc-100 text-zinc-900 pl-10 pr-4 py-2.5 rounded-xl text-sm border border-transparent focus:border-emerald-500 focus:outline-none"
                            />
                        </form>

                        <div className="flex flex-col gap-1 text-sm font-medium text-zinc-700 pt-2">
                            <Link
                                href="/products"
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-3 py-2 rounded-lg hover:bg-zinc-100"
                            >
                                Shop All Products
                            </Link>
                            <Link
                                href="/categories"
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-3 py-2 rounded-lg hover:bg-zinc-100"
                            >
                                Browse Categories
                            </Link>
                            <Link
                                href="/verify-batch"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 font-semibold"
                            >
                                <QrCode size={16} />
                                <span>Verify Food Batch & Lab Test</span>
                            </Link>
                            <div className="border-t border-zinc-100 my-2 pt-2">
                                {isAuthenticated && user ? (
                                    <Link
                                        href="/account"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-100"
                                    >
                                        <User size={16} />
                                        <span>My Account ({user.firstName})</span>
                                    </Link>
                                ) : (
                                    <Link
                                        href="/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-100"
                                    >
                                        <LogIn size={16} />
                                        <span>Customer Login / Register</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
