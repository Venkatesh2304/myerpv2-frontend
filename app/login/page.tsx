
"use client";

import React, { useState,useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const LoginPage: React.FC = () => {
	const { login, error } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setFormError(null);
		setSubmitting(true);
		try {
			await login(username.trim(), password);
		} catch {
			setFormError("Invalid username or password");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Sign in</CardTitle>
					<CardDescription>Use your account to continue</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="username">Username</Label>
							<Input id="username" value={username} autoComplete="username" onChange={(e) => setUsername(e.target.value)} required />
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input id="password" type="password" value={password} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} required />
						</div>
						{(error || formError) && (
							<p className="text-sm text-red-600" role="alert">
								{formError || error}
							</p>
						)}
						<Button type="submit" className="w-full" disabled={submitting}>
							{submitting ? "Signing in..." : "Sign in"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
};

export default function Page() {
	const { user } = useAuth();

	useEffect(() => {
		if (user) {
			const params = new URLSearchParams(window.location.search);
			const next = params.get("next") || "/";
			window.location.replace(next);
		}
	}, [user]);

	return <LoginPage />;
}