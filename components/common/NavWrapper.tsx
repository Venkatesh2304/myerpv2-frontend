"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { NavBar } from "@/components/common/NavBar";

export default function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";
  return (
    <>
      {!hideNav && <NavBar />}
      <main>{children}</main>
    </>
  );
}
