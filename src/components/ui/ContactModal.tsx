"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { X, Copy, Check, Send, Mail, Loader2, AlertCircle } from "lucide-react";
import { Button } from "./Button";
import { GithubIcon, LinkedinIcon } from "./BrandIcons";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

const CONTACT_ENDPOINT =
  process.env.NEXT_PUBLIC_CONTACT_ENDPOINT ??
  "https://contact-form-handler.fedele-davide.workers.dev/";
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAAF_YjX5DrI_86EZC";
const TURNSTILE_ACTION = "contact";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme?: "auto" | "light" | "dark";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { resolvedTheme } = useTheme();
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const emailAddress = "davide@fedele.dev";

  // Render the Turnstile widget while the form is on screen; remove it when
  // the modal closes or switches to the success state.
  useEffect(() => {
    const container = turnstileContainer.current;
    if (
      !isOpen ||
      submitted ||
      !turnstileReady ||
      !container ||
      !window.turnstile
    ) {
      return;
    }
    const id = window.turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      action: TURNSTILE_ACTION,
      theme: resolvedTheme === "light" ? "light" : "dark",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    widgetId.current = id;
    return () => {
      window.turnstile?.remove(id);
      widgetId.current = null;
      setTurnstileToken("");
    };
  }, [isOpen, submitted, turnstileReady, resolvedTheme]);

  // Tokens are single-use: get a fresh one after every submission attempt.
  const resetTurnstile = useCallback(() => {
    if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
    setTurnstileToken("");
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!turnstileToken) {
        throw new Error("Please complete the verification check.");
      }

      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("email", formData.email);
      payload.append("message", formData.message);
      payload.append("cf-turnstile-response", turnstileToken);

      const response = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: payload,
      });

      let data;
      try {
        data = await response.json();
      } catch {
        // Fallback if response is not JSON
        data = { error: "Failed to send message." };
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to send message. Please try again.",
        );
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: "", email: "", message: "" });
        onClose();
      }, 2500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      resetTurnstile();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isOpen && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setTurnstileReady(true)}
        />
      )}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl p-6 space-y-6 text-text-main"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <Button
                variant="outline"
                onClick={onClose}
                aria-label="Close modal"
                className="absolute top-4 right-4 p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-border/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>

              <div>
                <h2 className="text-2xl font-bold font-sans text-text-main">
                  Get in Touch
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  Let&apos;s talk about engineering opportunities,
                  collaborations, or tech architecture.
                </p>
              </div>

              {/* Quick Email Copy Box */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border text-xs font-mono">
                <div className="flex items-center gap-2 text-text-main">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{emailAddress}</span>
                </div>
                <Button
                  onClick={handleCopyEmail}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface border border-border text-text-muted hover:text-primary hover:border-primary/50 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Contact Form */}
              {submitted ? (
                <div className="py-8 text-center space-y-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-main">
                    Message Received!
                  </h3>
                  <p className="text-xs text-text-muted max-w-xs mx-auto">
                    Thank you for reaching out. I will get back to you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="modal-name"
                      className="block text-xs font-mono text-text-muted mb-1"
                    >
                      NAME
                    </label>
                    <input
                      id="modal-name"
                      type="text"
                      required
                      disabled={isSubmitting}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-main text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="modal-email"
                      className="block text-xs font-mono text-text-muted mb-1"
                    >
                      EMAIL ADDRESS
                    </label>
                    <input
                      id="modal-email"
                      type="email"
                      required
                      disabled={isSubmitting}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="jane@company.com"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-main text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="modal-message"
                      className="block text-xs font-mono text-text-muted mb-1"
                    >
                      MESSAGE
                    </label>
                    <textarea
                      id="modal-message"
                      rows={4}
                      required
                      disabled={isSubmitting}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      placeholder="Tell me about your project or inquiry..."
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-main text-sm focus:outline-none focus:border-primary transition-colors resize-none disabled:opacity-50"
                    />
                  </div>

                  <div
                    ref={turnstileContainer}
                    className="flex justify-center min-h-[65px]"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={isSubmitting || !turnstileToken}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Social Links */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
                <span>Or connect directly on:</span>
                <div className="flex gap-3">
                  <a
                    href="https://github.com/davixx95"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <GithubIcon className="w-4 h-4" />
                    <span className="font-mono">GitHub</span>
                  </a>
                  <a
                    href="https://linkedin.com/in/davide-fedele"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <LinkedinIcon className="w-4 h-4" />
                    <span className="font-mono">LinkedIn</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
