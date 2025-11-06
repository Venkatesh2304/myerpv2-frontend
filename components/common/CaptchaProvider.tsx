"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AxiosResponse } from "axios";
import { type CaptchaAPI } from "@/lib/captcha";
import api from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

type Deferred<T> = { resolve: (v: T) => void; reject: (e: unknown) => void };
type Phase = "idle" | "loading" | "submitting";

const CaptchaContext = createContext<CaptchaAPI | null>(null);

export const useCaptcha = (): CaptchaAPI => {
  const ctx = useContext(CaptchaContext);
  if (!ctx) throw new Error("useCaptcha must be used within CaptchaProvider");
  return ctx;
}

export const CaptchaProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const retryRef = useRef<(() => Promise<AxiosResponse>) | null>(null);
  const deferredRef = useRef<Deferred<AxiosResponse> | null>(null);

  const resetState = () => {
    setCaptcha("");
    setError(null);
    setPhase("idle");
    setImageUrl(null);
    setKey(null);
    retryRef.current = null;
    deferredRef.current = null;
  };

  const fetchCaptchaImage = useCallback(async (k: string) => {
    setPhase("loading");
    try {
      // Revoke previous image URL to prevent memory leaks
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      const res = await api.post("/custom/captcha", { key: k }, { responseType: "blob" });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      setPhase("idle");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load captcha");
      setPhase("idle");
    }
  }, [imageUrl]);

  const challenge: CaptchaAPI["challenge"] = useCallback(
    (k, retry) => {
      // deferredRef.current?.reject(new Error("Superseded by new captcha challenge"));
      setOpen(true);
      setKey(k);
      retryRef.current = retry;
      fetchCaptchaImage(k);
      return new Promise<AxiosResponse>((resolve, reject) => {
        deferredRef.current = { resolve, reject };
      });
    },
    [key,fetchCaptchaImage]
  );

  const onClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      deferredRef.current?.reject(new Error("Captcha cancelled"));
      setOpen(false);
      resetState();
    }
  };


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !retryRef.current || !deferredRef.current) return;
    setPhase("submitting");
    setError(null);
    try {
      const data = await api.post("/custom/login", { key, captcha }).then((res) => res.data);
      // If backend says ok: false, refresh captcha and keep dialog open
      if (data?.ok === false) {
        setError(data?.message || data?.error || "Invalid captcha, please try again");
        setPhase("idle");
        setCaptcha("");
        await fetchCaptchaImage(key);
        return;
      }
      setOpen(false);
      const retried = await retryRef.current();
      deferredRef.current.resolve(retried);
      resetState();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setPhase("idle");
    }
  };

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const value = useMemo<CaptchaAPI>(() => ({ challenge }), [challenge]);

  const isLoadingImg = phase === "loading";
  const isSubmitting = phase === "submitting";
  const isBusy = isLoadingImg || isSubmitting;

  return (
    <CaptchaContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{key?.toUpperCase()} Login</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-3">
            {isLoadingImg ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
              </div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="captcha" className="w-full h-auto rounded border" />
            ) : (
              <div className="text-sm text-muted-foreground">Captcha not available.</div>
            )}

            <Input
              id="captcha"
              value={captcha}
              onChange={(e) => setCaptcha(e.target.value)}
              placeholder="Enter captcha"
              disabled={isLoadingImg}
            />
            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={isBusy}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                  </span>
                ) : (
                  "Submit"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isBusy}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </CaptchaContext.Provider>
  );
};
