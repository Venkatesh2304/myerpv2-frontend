"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";

const navBase =
  "relative inline-flex items-center rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 ease-out hover:text-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 after:absolute after:left-2 after:right-2 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary/70 after:transition-all after:duration-300 after:ease-out after:w-0 after:opacity-0 hover:after:w-[calc(100%-1rem)] hover:after:opacity-100";
const navActive = "text-primary after:w-[calc(100%-1rem)] after:opacity-100";

export function NavBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const isActive = (p: string) => pathname === p;

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold tracking-wide mr-20 transition-opacity hover:opacity-90">ERP</span>
          <nav className="flex items-center gap-10">
            <Link href="/gst" className={clsx(navBase, isActive("/gst") && navActive)}>
              GSTR1
            </Link>
            <Link href="/einvoice" className={clsx(navBase, isActive("/einvoice") && navActive)}>
              E-Invoice
            </Link>
            <Link href="/configuration" className={clsx(navBase, isActive("/configuration") && navActive)}>
              Configuration
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user ? user.username.toLocaleUpperCase() : "Guest"}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
