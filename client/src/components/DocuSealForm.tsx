"use client";

import { useEffect, useRef, useState } from "react";

const DOCUSEAL_SCRIPT_URL = "https://cdn.docuseal.com/js/form.js";

declare global {
  interface Window {
    docusealForm?: HTMLElement & { addEventListener: (type: string, handler: (e: CustomEvent) => void) => void };
  }
}

export interface DocuSealFormProps {
  /** Signing form URL (e.g. from DocuSeal API submitter embed_src or https://docuseal.com/s/{slug}) */
  src: string;
  /** Pre-fill signer email */
  email?: string;
  /** Called when the form is completed */
  onCompleted?: (detail: unknown) => void;
  /** Optional class for the container */
  className?: string;
}

/**
 * Embeds the DocuSeal signing form in React.
 * Loads the DocuSeal form script and renders the custom element with the given signing URL.
 */
export function DocuSealForm({ src, email, onCompleted, className }: DocuSealFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  useEffect(() => {
    if (!src) return;

    const existing = document.querySelector(`script[src="${DOCUSEAL_SCRIPT_URL}"]`);
    if (existing) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = DOCUSEAL_SCRIPT_URL;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Failed to load DocuSeal form script.");
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [src]);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !src) return;

    containerRef.current.innerHTML = "";
    const form = document.createElement("docuseal-form") as HTMLElement & {
      addEventListener: (type: string, handler: (e: CustomEvent) => void) => void;
    };
    form.setAttribute("data-src", src);
    if (email) form.setAttribute("data-email", email);
    form.setAttribute("id", "docusealForm");

    if (onCompletedRef.current) {
      form.addEventListener("completed", (e: Event) => {
        onCompletedRef.current?.((e as CustomEvent).detail);
      });
    }

    containerRef.current.appendChild(form);
    window.docusealForm = form;
  }, [scriptLoaded, src, email]);

  if (error) {
    return (
      <div className={className} role="alert">
        <p className="text-sm text-destructive">{error}</p>
        <p className="text-xs text-muted-foreground mt-1">
          You can still sign via the link sent to the signer&apos;s email.
        </p>
      </div>
    );
  }

  if (!scriptLoaded) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">Loading signing form…</p>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
