import axios from "axios";
import { getCookie } from "./cookies";

const api = axios.create({
	// Use same-origin by default; set your base URL if needed.
	baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
	withCredentials: true,
});

api.interceptors.response.use(
	(res) => res,
	(err) => {
		const status = err?.response?.status;
		if (status === 401 && typeof window !== "undefined") {
			// Avoid loops when already on the login page
			if (window.location.pathname !== "/login") {
				const here = window.location.pathname + window.location.search;
				const next = here && here !== "/login" ? `?next=${encodeURIComponent(here)}` : "";
				window.location.replace(`/login${next}`);
			}
		}
		return Promise.reject(err);
	}
);

export default api;
