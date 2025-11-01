"use client";

import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";

const StickyUserBar: React.FC = () => {
	const { user, loading, logout } = useAuth();

	if (loading) return null;

	return (
		<div className="fixed top-2 right-2 z-50 flex items-center gap-2 rounded-md bg-white/80 dark:bg-neutral-900/80 backdrop-blur px-3 py-1 border">
			<span className="text-sm">{user ? user.username.toLocaleUpperCase() : "Guest"}</span>
			{user ? (
				<Button size="sm" variant="ghost" onClick={logout}>
					Logout
				</Button>
			) : (
				<Button size="sm" variant="ghost" onClick={() => (window.location.href = "/login")}>
					Login
				</Button>
			)}
		</div>
	);
};

export default StickyUserBar;
