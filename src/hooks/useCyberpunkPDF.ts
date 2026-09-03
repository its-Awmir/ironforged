"use client";

import { useCallback, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface UseCyberpunkPDFOptions {
  filename?: string;
  backgroundColor?: string;
  scale?: number;
}

interface UseCyberpunkPDFReturn {
  exportPDF: (containerId: string, options?: UseCyberpunkPDFOptions) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

const UNSAFE_COLOR_RE = /\b(oklch|oklab|lab|lch)\([^)]+\)/g;

function sanitizeStyleSheetText(css: string): string {
  return css.replace(UNSAFE_COLOR_RE, "#18181b");
}

function sanitizeAllStyleElements(doc: Document) {
  const styles = doc.querySelectorAll("style");
  styles.forEach((style) => {
    if (style.innerHTML && UNSAFE_COLOR_RE.test(style.innerHTML)) {
      UNSAFE_COLOR_RE.lastIndex = 0;
      style.innerHTML = sanitizeStyleSheetText(style.innerHTML);
    }
  });
  doc.querySelectorAll("link[rel='stylesheet']").forEach((link) => link.remove());
}

function stripUnsafeColors(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Element | null;
  while ((node = walker.nextNode() as Element | null)) {
    const inline = node as HTMLElement;
    if (inline.style && inline.style.length > 0) {
      for (let i = 0; i < inline.style.length; i++) {
        const prop = inline.style[i];
        const val = inline.style.getPropertyValue(prop);
        if (val && UNSAFE_COLOR_RE.test(val)) {
          UNSAFE_COLOR_RE.lastIndex = 0;
          inline.style.setProperty(prop, val.replace(UNSAFE_COLOR_RE, "#18181b"));
        }
      }
    }
  }
}

function hideInteractiveElements(root: Element) {
  const selectors = [
    ".no-print",
    "button",
    "input",
    "select",
    "textarea",
    "[role='button']",
    "[onclick]",
  ];
  selectors.forEach((sel) => {
    root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.style.display = "none !important";
    });
  });
}

function applySafeInlineStyles(container: HTMLElement) {
  container.style.backgroundColor = "#070709";
  container.style.color = "#f4f4f5";

  container.querySelectorAll<HTMLElement>(".premium-glow-card").forEach((card) => {
    card.style.backgroundColor = "#0f0f12";
    card.style.borderColor = "#27272a";
    card.style.border = "1px solid #27272a";
    card.style.color = "#f4f4f5";
    card.style.boxShadow = "none";
  });

  container.querySelectorAll<HTMLElement>("table").forEach((table) => {
    table.style.borderColor = "#27272a";
    table.style.borderCollapse = "collapse";
  });

  container.querySelectorAll<HTMLElement>("th, td").forEach((cell) => {
    cell.style.borderColor = "#1e1e22";
    cell.style.borderBottom = "1px solid #1e1e22";
  });

  container.querySelectorAll<HTMLElement>("[class*='text-white']").forEach((el) => {
    el.style.color = "#fafafa";
  });
  container.querySelectorAll<HTMLElement>("[class*='text-zinc-500']").forEach((el) => {
    el.style.color = "#71717a";
  });
  container.querySelectorAll<HTMLElement>("[class*='text-zinc-400']").forEach((el) => {
    el.style.color = "#a1a1aa";
  });
  container.querySelectorAll<HTMLElement>("[class*='text-zinc-600']").forEach((el) => {
    el.style.color = "#52525b";
  });
  container.querySelectorAll<HTMLElement>("[class*='text-red-400']").forEach((el) => {
    el.style.color = "#f87171";
  });
  container.querySelectorAll<HTMLElement>("[class*='text-emerald-400']").forEach((el) => {
    el.style.color = "#34d399";
  });
  container.querySelectorAll<HTMLElement>("[class*='text-orange-400']").forEach((el) => {
    el.style.color = "#fb923c";
  });
  container.querySelectorAll<HTMLElement>("[class*='text-amber-400']").forEach((el) => {
    el.style.color = "#fbbf24";
  });
  container.querySelectorAll<HTMLElement>("[class*='border-zinc-900']").forEach((el) => {
    el.style.borderColor = "#18181b";
  });
  container.querySelectorAll<HTMLElement>("[class*='border-emerald-500']").forEach((el) => {
    el.style.borderColor = "#059669";
  });
  container.querySelectorAll<HTMLElement>("[class*='border-red-500']").forEach((el) => {
    el.style.borderColor = "#ef4444";
  });
  container.querySelectorAll<HTMLElement>("[class*='border-blue-500']").forEach((el) => {
    el.style.borderColor = "#3b82f6";
  });

  container.querySelectorAll<HTMLElement>("svg").forEach((svg) => {
    svg.style.overflow = "visible";
  });
}

export function useCyberpunkPDF(): UseCyberpunkPDFReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportPDF = useCallback(
    async (containerId: string, options?: UseCyberpunkPDFOptions) => {
      setIsGenerating(true);
      setError(null);

      try {
        const element = document.getElementById(containerId);
        if (!element) {
          throw new Error(`Element #${containerId} not found.`);
        }

        const canvas = await html2canvas(element, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#070709",
          scale: options?.scale || 2,
          logging: false,
          windowWidth: 800,
          onclone: (doc) => {
            sanitizeAllStyleElements(doc);

            hideInteractiveElements(doc.body);
            stripUnsafeColors(doc.body);

            const cloned = doc.getElementById(containerId);
            if (cloned) {
              const clonedEl = cloned as HTMLElement;
              clonedEl.style.transform = "none";
              clonedEl.style.animation = "none";
              clonedEl.style.transition = "none";
              clonedEl.style.backgroundColor = "#070709";
              clonedEl.style.color = "#f4f4f5";
              clonedEl.style.padding = "24px";
              clonedEl.style.borderRadius = "0";

              applySafeInlineStyles(clonedEl);

              cloned.querySelectorAll<HTMLElement>("*").forEach((el) => {
                el.style.animation = "none";
                el.style.transition = "none";
              });
            }

            const body = doc.body;
            body.style.backgroundColor = "#070709";
            body.style.color = "#f4f4f5";
            body.style.padding = "0";
            body.style.margin = "0";

            const htmlEl = body.parentElement;
            if (htmlEl) {
              htmlEl.style.backgroundColor = "#070709";
              htmlEl.style.color = "#f4f4f5";
            }
          },
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pdf = new jsPDF("p", "mm", "a4");

        let position = 0;
        let remainingHeight = imgHeight;
        const pageContentHeight = pageHeight - 10;

        if (imgHeight <= pageHeight) {
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 5, imgWidth, imgHeight);
        } else {
          const pageCanvas = document.createElement("canvas");
          const pageCtx = pageCanvas.getContext("2d");

          if (!pageCtx) {
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 5, imgWidth, imgHeight);
          } else {
            while (remainingHeight > 0) {
              const sourceY = Math.floor((position / imgHeight) * canvas.height);
              const sourceHeight = Math.min(
                Math.ceil((pageContentHeight / imgHeight) * canvas.height),
                canvas.height - sourceY
              );

              pageCanvas.width = canvas.width;
              pageCanvas.height = sourceHeight;
              pageCtx.fillStyle = "#070709";
              pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
              pageCtx.drawImage(
                canvas,
                0, sourceY, canvas.width, sourceHeight,
                0, 0, canvas.width, sourceHeight
              );

              const sliceDataUrl = pageCanvas.toDataURL("image/png");
              const sliceImgHeight = (sourceHeight * imgWidth) / canvas.width;

              pdf.addImage(sliceDataUrl, "PNG", 0, 5, imgWidth, sliceImgHeight);

              remainingHeight -= pageContentHeight;
              position += pageContentHeight;

              if (remainingHeight > 0) {
                pdf.addPage();
              }
            }
          }
        }

        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const baseFilename = options?.filename || "IRONFORGED-Report";
        const finalFilename = `${baseFilename}-${dateStr}.pdf`;

        pdf.save(finalFilename);
      } catch (err) {
        const message = err instanceof Error ? err.message : "PDF generation failed.";
        setError(message);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { exportPDF, isGenerating, error };
}
