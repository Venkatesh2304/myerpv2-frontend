"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Period from "@/components/common/Period";
import { CaptchaProvider, useCaptcha } from "@/components/common/CaptchaProvider";
import { requestWithCaptcha } from "@/lib/captcha";
import { downloadFromAxiosResponse } from "@/lib/download";

type SummaryRow = {
  Company: string;
  "GST Type": string;
  "Taxable Value": number | string;
  CGST: number | string;
};

// New: API generate stats
type GenerateStats = {
  missing: number;
  mismatch: number;
  yet_to_be_pushed: number;
};

export default function GSTPage() {
  return (
    <CaptchaProvider>
      <GSTContent />
    </CaptchaProvider>
  );
}

// Reusable notice box (shared styles)
function NoticeBox({
  variant = "error",
  children,
}: {
  variant?: "error" | "warning";
  children: React.ReactNode;
}) {
  const tone =
    variant === "error"
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-yellow-50 text-yellow-800 border-yellow-200";
  return <div className={`border rounded-md p-3 text-sm ${tone}`}>{children}</div>;
}

function GSTContent() {
  const [period, setPeriod] = useState<string>("");
  const [rows, setRows] = useState<SummaryRow[] | null>(null);
  const [stats, setStats] = useState<GenerateStats | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingGST, setDownloadingGST] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [uploading, setUploading] = useState(false);
  const captcha = useCaptcha();

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!period) return;
    setSubmitting(true);
    // Clear previous stats on new submit
    setStats(null);
    try {
      const res = await requestWithCaptcha(
        {
          url: "/gst/generate",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          data: { period },
        },
        captcha
      );
      const summary = res?.data?.summary;
      // Capture counts from API
      setStats({
        missing: res?.data?.missing ?? 0,
        mismatch: res?.data?.mismatch ?? 0,
        yet_to_be_pushed: res?.data?.yet_to_be_pushed ?? 0,
      });
      if (Array.isArray(summary)) {
        setRows(summary as SummaryRow[]);
      } else {
        setRows([]);
      }
    } catch (err: any) {
      alert(err?.message ?? "Generation failed");
      setRows(null);
      setStats(null);
    } finally {
      setSubmitting(false);
    }
  };

  const onDownloadGST = async () => {
    if (!period) return;
    setDownloadingGST(true);
    try {
      const res = await requestWithCaptcha(
        {
          url: "/gst/download",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
          data: { period },
        },
        captcha
      );
      downloadFromAxiosResponse(res as any, `gst_${period}.xlsx`);
    } catch (err: any) {
      alert(err?.message ?? "Download failed");
    } finally {
      setDownloadingGST(false);
    }
  };

  const onDownloadSummary = async () => {
    if (!period) return;
    setDownloadingSummary(true);
    try {
      const res = await requestWithCaptcha(
        {
          url: "/gst/summary",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
          data: { period },
        },
        captcha
      );
      downloadFromAxiosResponse(res as any, `gst_summary_${period}.xlsx`);
    } catch (err: any) {
      alert(err?.message ?? "Download failed");
    } finally {
      setDownloadingSummary(false);
    }
  };

  const onDownloadJson = async () => {
    if (!period) return;
    setDownloadingJson(true);
    try {
      const res = await requestWithCaptcha(
        {
          url: "/gst/json",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
          data: { period },
        },
        captcha
      );
      downloadFromAxiosResponse(res as any, `gst_json_${period}.json`);
    } catch (err: any) {
      alert(err?.message ?? "Download failed");
    } finally {
      setDownloadingJson(false);
    }
  };

  const onUploadGST = async () => {
    if (!period) return;
    setUploading(true);
    try {
      const res = await requestWithCaptcha(
        {
          url: "/gst/upload",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          data: { period },
        },
        captcha
      );
      if (res?.data?.success) {
        alert("GST uploaded successfully");
      } else {
        alert(`Upload failed: ${res?.data?.error ?? "Unknown error"}`);
      }
    } catch (err: any) {
      alert(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>GSTR1 Filing</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onGenerate} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Period className="flex-1" onPeriodChange={(p) => setPeriod(p)} />
              <div className="flex-1 space-y-2 mt-2 flex items-center">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>
          </form>

          {/* Notices */}
          {stats && (
            <div className="mt-4 space-y-3">
              {stats.missing > 0 && (
                <NoticeBox variant="error">
                  You have {stats.missing} e-invoices not filed. File using{" "}
                  <a href="/einvoice" className="underline font-medium" target="_blank">
                    e-Invoice
                  </a>
                  .
                </NoticeBox>
              )}
              {stats.mismatch > 0 && (
                <NoticeBox variant="error">
                  You have {stats.mismatch} invoices mismatch between IKEA and e-Invoice. Check them in the summary.
                </NoticeBox>
              )}
              {stats.yet_to_be_pushed > 0 && (
                <NoticeBox variant="warning">
                  {stats.yet_to_be_pushed} einvoices yet to be auto-pushed to GSTR-1.  Kindly wait one day.
                </NoticeBox>
              )}
            </div>
          )}

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
                        <TableHead>GST Type</TableHead>
                        <TableHead className="text-right">Taxable Value</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, idx) => (
                        <TableRow key={`${r.Company}-${idx}`}>
                          <TableCell>{r.Company}</TableCell>
                          <TableCell>{r["GST Type"].toLocaleUpperCase()}</TableCell>
                          <TableCell className="text-right">{r["Taxable Value"]}</TableCell>
                          <TableCell className="text-right">{r.CGST}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 inline-flex">
                    <Button
                      onClick={onDownloadSummary}
                      disabled={downloadingSummary || !rows?.length}
                      className="rounded-r-none"
                    >
                      {downloadingSummary ? "Downloading..." : "GST Summary"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-l-0 rounded-none px-2"
                          disabled={!rows?.length}
                        >
                          ▼
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onDownloadGST} disabled={downloadingGST}>
                          {downloadingGST ? "Downloading..." : "Download GST"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDownloadJson} disabled={downloadingJson}>
                          {downloadingJson ? "Downloading..." : "JSON"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      onClick={onUploadGST}
                      disabled={uploading || !rows?.length}
                      className="border-l-0 rounded-l-none"
                      variant="outline"
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
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
