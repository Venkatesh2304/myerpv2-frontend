"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { deleteCookie, setCookie } from "../lib/cookies";

type User = { id: number; username: string };
type AuthContextType = {
	user: User | null;
	loading: boolean;
	error: string | null;
	login: (username: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	setUsernameLocal: (username: string) => void;
};

const AuthContext = createContext<AuthContextType>({
	user: null,
	loading: true,
	error: null,
	login: async () => {},
	logout: async () => {},
	setUsernameLocal: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await api.get("/me");
				if (cancelled) return;
				if (res.data?.authenticated && res.data?.user) {
					setUser(res.data.user);
					setCookie("username", res.data.user.username, 10);
				} else {
					setUser(null);
					if (window.location.pathname !== "/login") {
						const here = window.location.pathname + window.location.search;
						const next = here && here !== "/login" ? `?next=${encodeURIComponent(here)}` : "";
						window.location.replace(`/login${next}`);
					}
				}
			} catch {
				if (window.location.pathname !== "/login") {
					const here = window.location.pathname + window.location.search;
					const next = here && here !== "/login" ? `?next=${encodeURIComponent(here)}` : "";
					window.location.replace(`/login${next}`);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const login = async (username: string, password: string) => {
		setError(null);
		try {
			const res = await api.post("/login", { username, password });
			const u = res.data?.user as User | undefined;
			if (u) {
				setUser(u);
				setCookie("username", u.username, 10);
				const params = new URLSearchParams(window.location.search);
				const next = params.get("next") || "/";
				window.location.assign(next);
			} else {
				setError("Login failed");
			}
		} catch (e: any) {
			const msg = e?.response?.data?.error === "invalid_credentials" ? "Invalid credentials" : "Login failed";
			setError(msg);
			throw e;
		}
	};

	const logout = async () => {
		try {
			await api.post("/logout");
		} catch {
			// ignore
		} finally {
			setUser(null);
			deleteCookie("username");
			window.location.replace("/login");
		}
	};

	const setUsernameLocal = (username: string) => {
		if (user) setUser({ ...user, username });
		setCookie("username", username, 10);
	};

	const value = useMemo(
		() => ({ user, loading, error, login, logout, setUsernameLocal }),
		[user, loading, error]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
