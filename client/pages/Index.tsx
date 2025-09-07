import { useEffect, useMemo, useRef, useState } from "react";

type CategoryKey = "positivity" | "motivation" | "gratitude" | "selflove";

const QUOTES: Record<CategoryKey, string[]> = {
  positivity: [
    "You are a sky full of stars.",
    "Small steps still move you forward.",
    "Be the reason someone smiles today.",
    "Your energy introduces you before you speak.",
    "You radiate warmth and light.",
  ],
  motivation: [
    "Start where you are. Use what you have. Do what you can.",
    "Progress over perfection.",
    "You’ve got this—keep going.",
    "Dream big. Start small. Act now.",
    "One day or day one. You decide.",
  ],
  gratitude: [
    "There is always, always something to be grateful for.",
    "Collect moments, not things.",
    "Gratitude turns what we have into enough.",
    "Find joy in the little things.",
    "Today is a good day to notice the good.",
  ],
  selflove: [
    "You are enough, exactly as you are.",
    "Treat yourself with gentle kindness.",
    "Your pace is perfect for your path.",
    "Speak to yourself like someone you love.",
    "Bloom at your own speed.",
  ],
};

const FILTERS = [
  { key: "none", label: "None", css: "none" },
  { key: "warm", label: "Warm", css: "contrast(1.05) saturate(1.2) hue-rotate(-10deg)" },
  { key: "cool", label: "Cool", css: "contrast(1.05) saturate(1.1) hue-rotate(10deg)" },
  { key: "sepia", label: "Sepia", css: "sepia(0.6) contrast(1.05)" },
  { key: "mono", label: "B&W", css: "grayscale(1) contrast(1.05)" },
  { key: "soft", label: "Soft", css: "contrast(0.98) saturate(0.95) brightness(1.02)" },
  { key: "fade", label: "Fade", css: "contrast(0.95) saturate(0.8)" },
  { key: "vivid", label: "Vivid", css: "contrast(1.15) saturate(1.3)" },
  { key: "vintage", label: "Vintage", css: "sepia(0.7) saturate(0.85) contrast(1.05) brightness(0.95)" },
  { key: "vignette", label: "Vignette", css: "contrast(1.02) saturate(1.02)" },
  { key: "film", label: "Film", css: "contrast(1.1) saturate(1.05)" },
  { key: "grainy", label: "Grainy", css: "contrast(1.05) saturate(0.95)" },
];

export default function Index() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const snapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedUrls, setCapturedUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [filterKey, setFilterKey] = useState<string>("none");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [prepMessage, setPrepMessage] = useState<string | null>(null);
  const rawCapturedRef = useRef<string | null>(null);

  const filterCss = useMemo(() => FILTERS.find(f => f.key === filterKey)?.css || "none", [filterKey]);

  const randomizeFilter = (excludeNone = true) => {
    const choices = FILTERS.filter(f => (excludeNone ? f.key !== "none" : true));
    const pick = choices[Math.floor(Math.random() * choices.length)];
    setFilterKey(pick.key);
  };

  const applyFilterToRaw = async () => {
    if (!rawCapturedRef.current) return;
    try {
      const img = new Image();
      img.src = rawCapturedRef.current;
      await img.decode();
      const canvas = snapCanvasRef.current ?? document.createElement("canvas");
      snapCanvasRef.current = canvas;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.filter = filterCss;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = "none";
      const url = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedUrl(url);
    } catch (e) {
      console.error("applyFilterToRaw error", e);
    }
  };

  useEffect(() => {
    if (rawCapturedRef.current) {
      applyFilterToRaw();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!streamRef.current && !capturedUrl && !capturedUrls.length) {
          startCamera();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedUrl, capturedUrls]);

  const startCamera = async () => {
    try {
      stopCamera();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch (_) {}
      }
      setHasCamera(true);
    } catch (e) {
      console.error("Camera error", e);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const attemptFocus = async (clientX?: number, clientY?: number) => {
    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;
      const capabilities: any = track.getCapabilities?.();
      if (capabilities && capabilities.focusMode) {
        const modes = capabilities.focusMode;
        const mode = modes.includes('single-shot') ? 'single-shot' : (modes.includes('continuous') ? 'continuous' : modes[0]);
        await track.applyConstraints({ advanced: [{ focusMode: mode }] } as any);
      }
      if (clientX != null && clientY != null && capabilities && (capabilities.pointsOfInterest || capabilities.pointOfInterest)) {
        const video = videoRef.current!;
        const rect = video.getBoundingClientRect();
        const nx = (clientX - rect.left) / rect.width;
        const ny = (clientY - rect.top) / rect.height;
        await track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x: nx, y: ny }] }] } as any);
      }
      if (capabilities && typeof capabilities.focusDistance !== 'undefined') {
        const min = capabilities.focusDistance.min || 0;
        const max = capabilities.focusDistance.max || 0;
        const val = (min + max) / 2;
        await track.applyConstraints({ advanced: [{ focusDistance: val }] } as any);
      }
    } catch (e) {
      // ignore unsupported
    }
  };

  const captureOnce = async () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = snapCanvasRef.current ?? document.createElement("canvas");
    snapCanvasRef.current = canvas;
    const w = video.videoWidth || 960;
    const h = video.videoHeight || 1280;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.filter = filterCss;
    ctx.drawImage(video, 0, 0, w, h);
    ctx.filter = "none";
    const url = canvas.toDataURL("image/jpeg", 0.9);
    return url;
  };

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  const startCaptureSequence = async () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    setCapturedUrls([]);
    const prepTexts = [
      'Get ready for your first photo!',
      'Get ready for your second photo!',
      'Get ready for your third photo!',
    ];
    // 3 photos with prep message (1.7s) + 3-second countdown each -> ~13s
    for (let i = 0; i < 3; i++) {
      setPrepMessage(prepTexts[i]);
      // show prep for ~1.7s
      await sleep(1700);
      setPrepMessage(null);
      // countdown 3..1
      for (let c = 3; c >= 1; c--) {
        setCountdown(c);
        await sleep(1000);
      }
      setCountdown(null);
      const url = await captureOnce();
      if (url) {
        rawCapturedRef.current = url;
        // preserve capture order: first captured at index 0 (top)
        setCapturedUrls(prev => [...prev, url]);
        setCapturedUrl(url);
      }
      // short pause between photos
      await sleep(300);
    }
    setPrepMessage(null);
    setIsCapturing(false);
    stopCamera();
    setTimeout(() => randomizeFilter(true), 20);
  };

  const onUpload = async (file: File) => {
    // keep single-file compatibility: delegate to handler
    await handleUploadFiles(file ? [file] as any : null);
  };

  const handleUploadFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 3);
    const urls: string[] = [];
    for (const f of arr) {
      const dataUrl = await new Promise<string | null>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => res(null);
        reader.readAsDataURL(f);
      });
      if (!dataUrl) continue;
      // ensure image can decode
      const img = new Image();
      img.src = dataUrl;
      try { await img.decode(); } catch (_) {}
      urls.push(dataUrl);
    }
    if (!urls.length) return;
    rawCapturedRef.current = urls[0];
    setCapturedUrl(urls[0]);
    setCapturedUrls(urls);
    setTimeout(() => randomizeFilter(true), 20);
    stopCamera();
  };

  const retake = () => {
    setCapturedUrl(null);
    setCapturedUrls([]);
    startCamera();
  };

  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ) => {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, yy);
        line = words[n] + " ";
        yy += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line.trim(), x, yy);
  };

  function getCssHslVar(varName: string) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!raw) return null;
    return `hsl(${raw})`;
  }

  function containDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    const scale = Math.min(dw / sw, dh / sh);
    const destW = sw * scale;
    const destH = sh * scale;
    const destX = dx + (dw - destW) / 2;
    const destY = dy + (dh - destH) / 2;
    ctx.drawImage(img, 0, 0, sw, sh, destX, destY, destW, destH);
  }

  function cover(sw: number, sh: number, dw: number, dh: number) {
    const sRatio = sw / sh;
    const dRatio = dw / dh;
    let sx = 0, sy = 0, cw = sw, ch = sh;
    if (sRatio > dRatio) {
      ch = sh;
      cw = sh * dRatio;
      sx = (sw - cw) / 2;
      sy = 0;
    } else {
      cw = sw;
      ch = sw / dRatio;
      sx = 0;
      sy = (sh - ch) / 2;
    }
    return { sx, sy, sw: cw, sh: ch };
  }

  
  const composePolaroid = async () => {
    const imgs = capturedUrls.length ? capturedUrls : capturedUrl ? [capturedUrl] : [];
    if (!imgs.length) return null;
    setBusy(true);
    try {
      const loaded = await Promise.all(
        imgs.map(async (src) => {
          const im = new Image();
          im.src = src;
          await im.decode();
          return im;
        }),
      );

      // ensure we draw top-to-bottom in capture order (first captured -> top)
      const loadedOrdered = loaded.slice();

      // Output size tuned for vertical poster: enforce width and tall height to fit three 3:4 images stacked
      const W = 900; // output width in px
      const H = 3200; // output height in px
      const canvas = document.createElement("canvas");
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.scale(dpr, dpr);

      const paperColor = getCssHslVar('--paper') || '#ffffff';
      const frameAccent = 'rgba(0,0,0,0.06)';

      // paper background
      ctx.fillStyle = paperColor;
      ctx.fillRect(0, 0, W, H);

      // polaroid paper with light vintage border
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.14)";
      ctx.shadowBlur = 36;
      ctx.shadowOffsetY = 18;
      const pad = 40;
      const paperWidth = W - pad * 2;
      const paperHeight = H - pad * 2;
      const paperX = pad;
      const paperY = pad;
      roundRect(ctx, paperX, paperY, paperWidth, paperHeight, 28);
      ctx.fillStyle = paperColor;
      ctx.fill();
      // inner subtle stroke to emulate photo strip edge
      ctx.lineWidth = 6;
      ctx.strokeStyle = frameAccent;
      ctx.stroke();
      ctx.restore();

      // layout photos inside the Polaroid area as 3 stacked rows
      const innerPadX = 48;
      const innerPadTop = 56;
      const innerPadBottom = 140; // extra room for date label
      const photoX = paperX + innerPadX;
      const photoY = paperY + innerPadTop;
      const photoW = paperWidth - innerPadX * 2;
      const photoH = paperHeight - innerPadTop - innerPadBottom;

      const gap = 12;
      const rows = Math.min(3, loadedOrdered.length);

      // enforce each cell to be 3:4 (w:h)
      let cellW = photoW;
      let cellH = Math.floor(cellW * (4 / 3));
      // if total height exceeds available space, shrink width to fit
      if (cellH * rows + gap * (rows - 1) > photoH) {
        cellH = Math.floor((photoH - gap * (rows - 1)) / rows);
        cellW = Math.floor(cellH * (3 / 4));
      }
      const offsetX = Math.floor((photoW - cellW) / 2);

      // draw frames and images
      for (let i = 0; i < rows; i++) {
        const dy = photoY + i * (cellH + gap);
        const dx = photoX + offsetX;
        // draw inner frame (white with subtle shadow)
        ctx.save();
        roundRect(ctx, dx, dy, cellW, cellH, 14);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.stroke();
        ctx.clip();

        // draw image cropped to cell using cover while maintaining 3:4 aspect
        const img = loadedOrdered[i];
        const c = cover(img.naturalWidth, img.naturalHeight, cellW, cellH);
        // apply visual filter (same as preview) so export matches preview
        try {
          ctx.filter = filterCss || 'none';
        } catch (e) {
          ctx.filter = 'none';
        }
        ctx.drawImage(img, c.sx, c.sy, c.sw, c.sh, dx, dy, cellW, cellH);
        ctx.filter = 'none';

        ctx.restore();
      }

      // vintage scratches / subtle lines between photos
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = '#000';
      for (let i = 1; i < rows; i++) {
        const yLine = photoY + i * cellH + (i - 1) * gap - Math.floor(gap / 2);
        ctx.fillRect(photoX + 6, yLine, photoW - 12, 1);
      }
      ctx.restore();

      // subtle grain overlay on photo area
      drawGrain(ctx, photoX, photoY, photoW, photoH, 0.06);

      // small emoji watermark inside the bottom frame (left side)
      const bottomIndex = rows - 1;
      const bottomDy = photoY + bottomIndex * (cellH + gap);
      const wmLeft = photoX + offsetX + 12;
      const wmBottom = bottomDy + cellH - 12;
      ctx.save();
      const emojiSize = Math.min(48, Math.round(cellH * 0.28));
      ctx.font = `${emojiSize}px sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.fillText('😊', wmLeft, wmBottom);
      ctx.restore();

      // date label (handwritten style) centered at bottom of the paper
      const dateText = new Date().toLocaleDateString();
      ctx.fillStyle = '#3C2A21';
      ctx.textAlign = 'center';
      ctx.font = "36px 'Caveat', cursive";
      const dateX = paperX + paperWidth / 2;
      const dateY = paperY + paperHeight - 36;
      ctx.fillText(dateText, dateX, dateY);

      return canvas;
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    const canvas = await composePolaroid();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smilebooth-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/jpeg", 0.92);
  };

  const onShare = async () => {
    const canvas = await composePolaroid();
    if (!canvas) return;
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(b => res(b), "image/jpeg", 0.92));
    if (!blob) return onDownload();
    const file = new File([blob], `smilebooth-${Date.now()}.jpg`, { type: "image/jpeg" });
    if ((navigator as any).share && (navigator as any).canShare?.({ files: [file] })) {
      try {
        await (navigator as any).share({ files: [file], title: "Smile Booth" });
      } catch (_) {
        onDownload();
      }
    } else {
      onDownload();
    }
  };

  const active = capturedUrls.length > 0;

  return (
    <div className="min-h-screen bg-[hsl(var(--mood-bg))] text-[hsl(var(--mood-ink))]">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl px-4 pb-28">

        <main className="space-y-4 mt-4">
          <section className="rounded-2xl bg-[hsl(var(--paper))] shadow-lg ring-1 ring-black/5 p-3">
            {(!active || isCapturing) ? (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-pink-50 to-violet-50 aspect-[3/4] flex items-center justify-center">
                {hasCamera ? (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      onClick={(e) => {
                        attemptFocus(e.clientX, e.clientY);
                      }}
                      className="h-full w-full object-cover"
                    />
                    {(isCapturing && (countdown != null || prepMessage)) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {prepMessage ? (
                          <div className="rounded-lg bg-[rgba(0,0,0,0.6)] text-white px-6 py-4 text-center text-lg font-semibold">{prepMessage}</div>
                        ) : (
                          <div className="rounded-full bg-[rgba(0,0,0,0.6)] text-white w-28 h-28 flex items-center justify-center text-4xl font-bold">{countdown}</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-6 text-center text-sm text-[hsl(var(--mood-muted-ink))]">
                    <p>Camera unavailable. You can upload a photo instead.</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFacing(facing === "user" ? "environment" : "user")}
                      className="rounded-full bg-[hsl(var(--paper))] px-3 py-2 text-sm shadow"
                    >
                      Flip
                    </button>
                    <label className="rounded-full bg-[hsl(var(--mood-primary))] px-5 py-3 text-sm shadow hover:brightness-105 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        multiple
                        onChange={(e) => handleUploadFiles(e.target.files)}
                      />
                      Upload (up to 3)
                    </label>
                  </div>
                  <button
                    onClick={startCaptureSequence}
                    className="h-14 w-14 rounded-full bg-[hsl(var(--mood-primary))] shadow-md active:scale-95 transition cute-pulse"
                    aria-label="Take photo sequence"
                  />
                </div>
              </div>
            ) : (
              <PolaroidPreview
                images={capturedUrls.length ? capturedUrls : capturedUrl ? [capturedUrl] : []}
                filterCss={filterCss}
              />
            )}
          </section>

          <section className="rounded-2xl bg-[hsl(var(--paper))] shadow-lg ring-1 ring-black/5 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2 flex items-center justify-between gap-2">
                <p className="text-xs text-[hsl(var(--mood-muted-ink))]">Capture three quick shots — say cheese! ✿</p>
                <div />
              </div>

              <div className="col-span-2 flex items-center justify-center gap-2 pt-1">
                {!active ? (
                  <span className="text-xs text-[hsl(var(--mood-muted-ink))]">Tip: You can upload if the camera is blocked.</span>
                ) : (
                  <div className="flex items-center justify-center w-full gap-4 py-2">
                    <button onClick={retake} className="rounded-md px-4 py-2 bg-[hsl(var(--mood-accent))] text-[hsl(var(--mood-accent-ink))] shadow">Retake</button>
                    <button onClick={onDownload} disabled={busy} className="rounded-md px-5 py-3 bg-[hsl(var(--mood-primary))] text-white shadow-lg ring-2 ring-[hsl(var(--mood-primary))] hover:brightness-105 disabled:opacity-50">Download</button>
                    <button onClick={onShare} disabled={busy} className="rounded-md px-4 py-2 bg-[hsl(var(--mood-secondary))] text-[hsl(var(--mood-secondary-ink))] shadow disabled:opacity-50">Share</button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <p className="text-center text-xs text-[hsl(var(--mood-muted-ink))]">
            Your photos never leave your device. Everything happens in your browser.
          </p>
        </main>
      </div>
    </div>
  );
}

function PolaroidPreview({ images, filterCss }: { images: string[]; filterCss: string }) {
  const imgs = images.slice(0,3);
  // display order: top-to-bottom where first captured is top
  const display = imgs.slice();
  const [visible, setVisible] = useState<boolean[]>([]);

  useEffect(() => {
    // animate entries when images change
    setVisible([]);
    const timers: number[] = [];
    display.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setVisible(v => {
          const nv = v.slice();
          nv[i] = true;
          return nv;
        });
      }, 400 * i);
      timers.push(t);
    });
    return () => timers.forEach(t => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.join("|")]);

  return (
    <div className="relative mx-auto w-full" style={{maxWidth: 240}}>
      <div className="relative rounded-2xl bg-[hsl(var(--paper))] p-4 shadow-xl" style={{ width: 220 }}>
        <div className="relative overflow-hidden rounded-md border border-black/5 p-2 bg-[hsl(var(--paper))]">
          <div className="w-full bg-[hsl(var(--paper))] flex items-center justify-center" style={{height: 780}}>
            <div className="flex flex-col gap-6 h-full w-full">
              {display.map((src, idx) => {
                const isVisible = !!visible[idx];
                const transform = isVisible ? 'translateY(0) scale(1) rotate(0deg)' : 'translateY(-40px) scale(1.06) rotate(-6deg)';
                const box = isVisible ? '0 14px 30px rgba(0,0,0,0.12)' : 'none';
                return (
                  <div key={idx} className="h-1/3 w-full rounded-sm overflow-hidden border bg-white relative" style={{transform, opacity: isVisible ? 1 : 0, transition: 'transform 550ms cubic-bezier(.2,.8,.2,1), opacity 400ms ease', boxShadow: box}}>
                    <img src={src} className="h-full w-full object-cover" style={{ filter: filterCss }} alt={`p${idx}`} />
                    {idx === display.length - 1 && (
                      <div style={{ position: 'absolute', left: 8, bottom: 8, opacity: 0.95, fontSize: 20 }}>😊</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="grain-overlay" />
          </div>
        </div>
        <div className="pt-4">
          <div className="mt-2 text-center">
            <span className="font-hand text-[hsl(var(--mood-muted-ink))] text-sm">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function cover(sw: number, sh: number, dw: number, dh: number) {
  const sRatio = sw / sh;
  const dRatio = dw / dh;
  let sx = 0, sy = 0, cw = sw, ch = sh;
  if (sRatio > dRatio) {
    ch = sh;
    cw = sh * dRatio;
    sx = (sw - cw) / 2;
    sy = 0;
  } else {
    cw = sw;
    ch = sw / dRatio;
    sx = 0;
    sy = (sh - ch) / 2;
  }
  return { sx, sy, sw: cw, sh: ch };
}

function drawGrain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, intensity = 0.05) {
  const area = Math.max(0, Math.floor((w * h) / 1200));
  ctx.save();
  ctx.globalAlpha = intensity;
  for (let i = 0; i < area; i++) {
    const rx = x + Math.random() * w;
    const ry = y + Math.random() * h;
    const s = Math.random() * 1.6;
    const g = Math.floor(180 + Math.random() * 60);
    ctx.fillStyle = `rgba(${g},${g},${g},1)`;
    ctx.fillRect(rx, ry, s, s);
  }
  ctx.restore();
}
