import type { AxiosResponse } from "axios";

function filenameFromContentDisposition(cd?: string | null, fallback = "download.bin") {
	if (!cd) return fallback;
	const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd);
	const encoded = match?.[1];
	const quoted = match?.[2];
	try {
		return decodeURIComponent((encoded || quoted || "").trim()) || fallback;
	} catch {
		return (encoded || quoted || "").trim() || fallback;
	}
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

export function downloadFromAxiosResponse(res: AxiosResponse<Blob>, fallbackFilename: string) {
	const cd = (res.headers?.["content-disposition"] as string | undefined) || "";
	const filename = filenameFromContentDisposition(cd, fallbackFilename);
	downloadBlob(res.data, filename);
}
