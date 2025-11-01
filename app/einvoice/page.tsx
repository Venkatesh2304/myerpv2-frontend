"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CaptchaProvider, useCaptcha } from "@/components/common/CaptchaProvider";
import { requestWithCaptcha } from "@/lib/captcha";
import Period from "@/components/common/Period";
import { formatPeriod } from "@/src/lib/period";
import api from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AxiosResponse } from "axios";

export default function EInvoicePage() {
	return (
		<CaptchaProvider>
			<EInvoiceContent />
		</CaptchaProvider>
	);
}

type Row = { company: string; amt: number; filed: number; not_filed: number };

function EInvoiceContent() {
	const [period, setPeriod] = useState<string>("");
	const [rows, setRows] = useState<Row[] | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [filing, setFiling] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [downloadingPdf, setDownloadingPdf] = useState(false);
	const captcha = useCaptcha();
	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			const p = period;
			const res = await requestWithCaptcha(
				{
					url: "/einvoice/damage/stats",
					method: "POST",
					headers: { "Content-Type": "application/json" },
					data: { period: p },
				},
				captcha
			);
			const stats = res.data?.stats;
			if (stats && typeof stats === "object" && !Array.isArray(stats)) {
				const next: Row[] = Object.entries(stats).map(([company, v]: any) => ({
					company,
					amt: `₹${Math.round(Number(v?.amt ?? 0))}`,
					filed: Number(v?.filed ?? 0),
					not_filed: Number(v?.not_filed ?? 0),
				}));
				setRows(next);
			} else {
				setRows([]);
			}
		} catch (err: any) {
			alert(err?.message ?? "Request failed");
			setRows(null);
		} finally {
			setSubmitting(false);
		}
	};

	const canFile = Array.isArray(rows) && rows.length > 0 && rows.some((r) => Number(r.not_filed) > 0);


	const download = async (res: AxiosResponse) => {
		const blob = res.data as Blob;
		const cd = (res.headers && (res.headers["content-disposition"] as string | undefined)) || "";
		const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd || "");
		console.log("download filename match:", match?.[1] || match?.[2], res.headers);
		const filename = decodeURIComponent(match?.[1] || match?.[2] || `damage_${period}.xlsx`);
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	const onFile = async () => {
		if (!canFile) return;
		setFiling(true);
		try {
			const res = await requestWithCaptcha(
				{
					url: "/einvoice/damage/file",
					method: "POST",
					headers: { "Content-Type": "application/json" },
					data: { period },
					responseType: "blob",
				},
				captcha
			);
			await download(res);
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
				"/einvoice/damage/excel",
				{ period },
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
					url: "/einvoice/damage/pdf",
					method: "POST",
					headers: { "Content-Type": "application/json" },
					responseType: "blob",
					data: { period },
				},
				captcha
			);
			await download(res);
		} catch (err: any) {
			alert(err?.message ?? "Download failed");
		} finally {
			setDownloadingPdf(false);
		}
	};

	return (
		<div className="container mx-auto max-w-xl p-4">
			<Card>
				<CardHeader>
					<CardTitle>Damage E-Invoice</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-6">
						<div className="flex flex-col sm:flex-row gap-4">
							<Period className="flex-1" onPeriodChange={(p) => setPeriod(p)} />
							<div className="flex-1 space-y-2 mt-2 flex items-center">
								<Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
									{submitting ? "Submitting..." : "Submit"}
								</Button>
							</div>
						</div>
					</form>

					{Array.isArray(rows) && (
						<div className="mt-6">
							{rows.length === 0 ? (
								<div className="text-sm text-muted-foreground">No data</div>
							) : (
								<>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Company</TableHead>
												<TableHead className="text-right">Amount</TableHead>
												<TableHead className="text-right">Filed</TableHead>
												<TableHead className="text-right">Not Filed</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{rows.map((r) => (
												<TableRow key={r.company}>
													<TableCell>{r.company}</TableCell>
													<TableCell className="text-right">{r.amt}</TableCell>
													<TableCell className="text-right text-green-600 font-medium">{r.filed}</TableCell>
													<TableCell className="text-right text-red-600 font-medium">{r.not_filed}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>

									<div className="mt-4 flex items-center justify-between">
										<Button variant="outline" onClick={onDownloadPdf} disabled={downloadingPdf || !rows?.length}>
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
									</div>
								</>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
