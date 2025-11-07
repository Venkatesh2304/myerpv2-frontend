"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CaptchaProvider, useCaptcha } from "@/components/common/CaptchaProvider";
import { requestWithCaptcha } from "@/lib/captcha";
import Period from "@/components/common/Period";
import { formatPeriod } from "@/src/lib/period";
import api from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AxiosResponse } from "axios";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EInvoicePage() {
	return (
		<CaptchaProvider>
			<EInvoiceContent />
		</CaptchaProvider>
	);
}

type Row = { company: string; amt: number; filed: number; not_filed: number, type: string };

function EInvoiceContent() {
	const [period, setPeriod] = useState<string>("");
	const [type, setType] = useState<string>("all");
	const [rows, setRows] = useState<Row[] | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [filing, setFiling] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [downloadingPdf, setDownloadingPdf] = useState(false);
	const [loadingIrn, setLoadingIrn] = useState(false);
	const initialIrnLoadedRef = useRef(false); // track first-time IRN load per mount
	const captcha = useCaptcha();

	// Keep only the fetch logic, callable from effects and actions
	const fetchSeq = useRef(0);
	const fetchStats = useCallback(async (p: string, t: string) => {
		const seq = ++fetchSeq.current;
		setSubmitting(true);
		try {
			const res = await requestWithCaptcha(
				{
					url: "/einvoice/stats",
					method: "POST",
					headers: { "Content-Type": "application/json" },
					data: { period: p, type: t },
				},
				captcha
			);
			if (seq !== fetchSeq.current) return; // ignore outdated results
			const stats = res.data?.stats;
			if (stats && typeof stats === "object" && Array.isArray(stats)) {
				setRows(stats);
			} else {
				setRows([]);
			}
		} catch (err: any) {
			if (seq !== fetchSeq.current) return;
			alert(err?.message ?? "Request failed");
			setRows([]);
		} finally {
			if (seq === fetchSeq.current) setSubmitting(false);
		}
	}, [captcha]);

	// Auto-trigger fetch whenever period or type changes (no submit button)
	useEffect(() => {
		if (!period) {
			setRows(null);
			return;
		}
		// First time after mount: load IRNs, then stats (no duplicate stats fetch)
		if (!initialIrnLoadedRef.current) {
			// mark as started immediately to avoid retrigger on type change
			initialIrnLoadedRef.current = true;
			setLoadingIrn(true);
			(async () => {
				try {
					await requestWithCaptcha(
						{
							url: "/einvoice/reload",
							method: "POST",
							headers: { "Content-Type": "application/json" },
							data: { period },
						},
						captcha
					);
					await fetchStats(period, type);
				} catch (err: any) {
					alert(err?.message ?? "Initial IRN load failed");
				} finally {
					setLoadingIrn(false);
				}
			})();
			return;
		}
		// Subsequent changes: only fetch stats
		fetchStats(period, type);
	}, [period, type]); // exclude fetchStats/captcha intentionally

	const canFile = Array.isArray(rows) && rows.length > 0 && rows.some((r) => Number(r.not_filed) > 0);

	const download = async (res: AxiosResponse) => {
		const blob = res.data as Blob;
		const cd = (res.headers && (res.headers["content-disposition"] as string | undefined)) || "";
		const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd || "");
		console.log("download filename match:", match?.[1] || match?.[2], res.headers);
		const filename = decodeURIComponent(match?.[1] || match?.[2] || `einvoice_${period}.xlsx`);
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	};

	const onFile = async () => {
		if (!canFile) return;
		setFiling(true);
		try {
			const res = await requestWithCaptcha(
				{
					url: "/einvoice/file",
					method: "POST",
					headers: { "Content-Type": "application/json" },
					data: { period, type },
					responseType: "blob",
				},
				captcha
			);
			await download(res);
			await fetchStats(period, type); // refresh after filing
		} catch (err: any) {
			alert(err?.message ?? "Filing failed");
		} finally {
			setFiling(false);
		}
	};

	const onDownload = async () => {
		if (!period) return;
		setDownloading(true);
		try {
			const res = await api.post(
				"/einvoice/excel",
				{ period, type },
				{
					responseType: "blob",
				}
			);
			await download(res);
		} catch (err: any) {
			alert(err?.message ?? "Download failed");
		} finally {
			setDownloading(false);
		}
	};

	const onDownloadPdf = async () => {
		if (!period) return;
		setDownloadingPdf(true);
		try {
			const res = await requestWithCaptcha(
				{
					url: "/einvoice/pdf",
					method: "POST",
					headers: { "Content-Type": "application/json" },
					responseType: "blob",
					data: { period, type },
				},
				captcha
			);
			await download(res);
		} catch (err: any) {
			console.log(err)
			alert(err?.message ?? "Download failed");
		} finally {
			setDownloadingPdf(false);
		}
	};

	const onLoadIrn = async () => {
		if (!period) return;
		setLoadingIrn(true);
		try {
			await requestWithCaptcha(
				{
					url: "/einvoice/reload",
					method: "POST",
					headers: { "Content-Type": "application/json" },
					data: { period },
				},
				captcha
			);
		} catch (err: any) {
			alert("Load IRNs failed");
			console.log(err);
		} finally {
			await fetchStats(period, type); // refresh stats after loading IRNs
			setLoadingIrn(false);
		}
	};

	return (
		<div className="container mx-auto max-w-xl p-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>E-Invoice</CardTitle>
					<Button
						variant="outline"
						size="sm"
						onClick={onLoadIrn}
						disabled={!period || loadingIrn || submitting}
					>
						{loadingIrn ? "Loading IRN..." : "Load IRN"}
					</Button>
				</CardHeader>
				<CardContent>
					{/* Controls without submit button */}
					<div className="space-y-6">
						<div className="flex flex-col sm:flex-row gap-4">
							<Period className="flex-1" onPeriodChange={(p) => setPeriod(p)} />
							<div className="flex-1 space-y-2">
								<Label htmlFor="einvoice-type">Type</Label>
								<Select value={type} onValueChange={setType}>
									<SelectTrigger id="einvoice-type">
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All</SelectItem>
										<SelectItem value="damage">Damage</SelectItem>
										<SelectItem value="sales">Sales</SelectItem>
										<SelectItem value="salesreturn">SalesReturn</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* Loading skeleton */}
					{submitting || loadingIrn ? (
						<div className="mt-6">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Company</TableHead>
										<TableHead>Type</TableHead>
										<TableHead className="text-right">Amount (Not Filed)</TableHead>
										<TableHead className="text-right">Filed</TableHead>
										<TableHead className="text-right">Not Filed</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{Array.from({ length: 5 }).map((_, i) => (
										<TableRow key={i}>
											<TableCell><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
											<TableCell><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
											<TableCell className="text-right"><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
											<TableCell className="text-right"><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
											<TableCell className="text-right"><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : (
						Array.isArray(rows) && (
							<div className="mt-6">
								{rows.length === 0 ? (
									<div className="text-sm text-muted-foreground">No data</div>
								) : (
									<>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Company</TableHead>
													<TableHead>Type</TableHead>
													<TableHead className="text-right">Amount (Not Filed)</TableHead>
													<TableHead className="text-right">Filed</TableHead>
													<TableHead className="text-right">Not Filed</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{rows.map((r) => (
													<TableRow key={r.company + r.type} className={r.not_filed == 0 ? "text-gray-600" : ""}>
														<TableCell>{r.company}</TableCell>
														<TableCell>{r.type}</TableCell>
														<TableCell className="text-right">{r.amt}</TableCell>
														<TableCell
															className={`text-right  ${r.not_filed > 0 && "font-medium text-green-600"}`}
														>{r.filed}</TableCell>
														<TableCell
															className={`text-right  ${r.not_filed > 0 && "font-medium text-red-600"}`}
														>
															{r.not_filed}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>

										<div className="mt-4 flex items-center justify-between">
											{type === "all" ? (
												<span className="text-gray-500 font-bold text-sm">Please go to respective invoice types to file einvoice</span>
											) : (
												<>
													<Button variant="outline" onClick={onDownloadPdf} disabled={(type != "damage") || downloadingPdf || !rows?.length}>
														{downloadingPdf ? "Downloading..." : "Download PDF"}
													</Button>
													<div className="flex gap-2">
														<Button variant="outline" onClick={onDownload} disabled={downloading || !rows?.length}>
															{downloading ? "Downloading..." : "Download Excel"}
														</Button>
														{canFile && (
															<Button onClick={onFile} disabled={filing}>
																{filing ? "Filing..." : "File E-Invoice"}
															</Button>
														)}
													</div>
												</>
											)}
										</div>
									</>
								)}
							</div>
						)
					)}
				</CardContent>
			</Card>
		</div>
	);
}
