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
  { key: "sepia", label: "Sepia", css: "sepia(0.5) contrast(1.05)" },
  { key: "mono", label: "B&W", css: "grayscale(1) contrast(1.05)" },
  { key: "vintage", label: "Vintage", css: "sepia(0.6) saturate(0.9) contrast(1.05) brightness(0.95)" },
  { key: "film", label: "Film", css: "contrast(1.1) saturate(1.05)" },
  { key: "grainy", label: "Grainy", css: "contrast(1.05) saturate(0.95)" },
];

const FRAMES = [
  { key: "polaroid", label: "Polaroid" },
  { key: "strip", label: "Strip" },
  { key: "twin", label: "Twin" },
];

export default function Index() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const snapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedUrls, setCapturedUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<string>("");
  const [filterKey, setFilterKey] = useState<string>("none");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [frameKey, setFrameKey] = useState<string>("polaroid");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
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
    // whenever filterKey changes and we have a raw capture, update displayed image
    if (rawCapturedRef.current) {
      applyFilterToRaw();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    randomizeQuote();
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facing]);

  const startCamera = async () => {
    try {
      stopCamera();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
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
    for (let i = 0; i < 2; i++) {
      // countdown 3..1
      for (let c = 3; c >= 1; c--) {
        setCountdown(c);
        await sleep(700);
      }
      setCountdown(null);
      const url = await captureOnce();
      if (url) {
        rawCapturedRef.current = url;
        setCapturedUrls(prev => [...prev, url]);
        setCapturedUrl(url);
      }
      await sleep(600);
    }
    setIsCapturing(false);
    stopCamera();
    randomizeQuote();
    setTimeout(() => randomizeFilter(true), 20);
  };

  const onUpload = async (file: File) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
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
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";
    const url = canvas.toDataURL("image/jpeg", 0.9);
    rawCapturedRef.current = url; // keep original raw capture
    setCapturedUrl(url);
    setCapturedUrls([url]);
    randomizeQuote();
    setTimeout(() => randomizeFilter(true), 20);
    stopCamera();
  };

  const randomizeQuote = () => {
    const all = Object.values(QUOTES).flat();
    const pick = all[Math.floor(Math.random() * all.length)];
    setQuote(pick);
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

  const composePolaroid = async () => {
    if (!capturedUrl) return null;
    setBusy(true);
    try {
      const base = new Image();
      base.src = capturedUrl;
      await base.decode();

      // target export size (mobile-first square-ish polaroid)
      const W = 1080;
      const H = 1350;
      const canvas = document.createElement("canvas");
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.scale(dpr, dpr);

      // soft background
      ctx.fillStyle = "#F8F4FF"; // pastel lavender
      ctx.fillRect(0, 0, W, H);

      // drop shadow for the polaroid
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 18;

      // polaroid paper
      const pad = 40;
      const paperWidth = W - pad * 2;
      const paperHeight = H - pad * 2;
      const radius = 24;
      const paperX = pad;
      const paperY = pad;
      roundRect(ctx, paperX, paperY, paperWidth, paperHeight, radius);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.restore();

      // inner photo area (top margin small, bottom margin large like polaroid)
      const innerPadX = 48;
      const innerPadTop = 56;
      const innerPadBottom = 220; // extra space for caption
      const photoX = paperX + innerPadX;
      const photoY = paperY + innerPadTop;
      const photoW = paperWidth - innerPadX * 2;
      const photoH = paperHeight - innerPadTop - innerPadBottom;

      // draw clipped photo with slight rounding
      ctx.save();
      roundRect(ctx, photoX, photoY, photoW, photoH, 16);
      ctx.clip();
      // apply filter
      ctx.filter = filterCss;
      // cover mode
      const { sx, sy, sw, sh } = cover(base.naturalWidth, base.naturalHeight, photoW, photoH);
      ctx.drawImage(base, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
      ctx.filter = "none";
      ctx.restore();

      // cute washi tape accents
      drawTape(ctx, paperX + paperWidth * 0.2, paperY - 6, 140, 28, "#FFD5E5", 6, -6);
      drawTape(ctx, paperX + paperWidth * 0.62, paperY - 10, 140, 28, "#D0F0FF", 6, 8);

      // quote text area
      const quoteX = paperX + 56;
      const quoteY = paperY + paperHeight - innerPadBottom + 56;
      const quoteMaxWidth = paperWidth - 112;
      await (document as any).fonts?.ready?.catch?.(() => {});
      ctx.fillStyle = "#3C2A21";
      ctx.textAlign = "left";
      ctx.font = "36px 'Special Elite', 'Courier New', monospace"; // typewriter
      wrapText(ctx, `\u201C${quote}\u201D`, quoteX, quoteY, quoteMaxWidth, 44);

      // watermark
      ctx.fillStyle = "#9B8C7B";
      ctx.textAlign = "right";
      ctx.font = "24px 'Caveat', 'Comic Sans MS', cursive";
      ctx.fillText("MoodBooth.app", paperX + paperWidth - 24, paperY + paperHeight - 24);

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
      a.download = `moodbooth-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/jpeg", 0.92);
  };

  const onShare = async () => {
    const canvas = await composePolaroid();
    if (!canvas) return;
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(b => res(b), "image/jpeg", 0.92));
    if (!blob) return onDownload();
    const file = new File([blob], `moodbooth-${Date.now()}.jpg`, { type: "image/jpeg" });
    if ((navigator as any).share && (navigator as any).canShare?.({ files: [file] })) {
      try {
        await (navigator as any).share({ files: [file], title: "MoodBooth", text: quote });
      } catch (_) {
        // user cancelled or share failed -> fall back to download
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
          {/* Camera / Preview panel */}
          <section className="rounded-2xl bg-white/70 shadow-lg ring-1 ring-black/5 p-3">
            {!active ? (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-pink-50 to-violet-50 aspect-[3/4] flex items-center justify-center">
                {hasCamera ? (
                  <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                ) : (
                  <div className="p-6 text-center text-sm text-[hsl(var(--mood-muted-ink))]">
                    <p>Camera unavailable. You can upload a photo instead.</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFacing(facing === "user" ? "environment" : "user")}
                      className="rounded-full bg-white/80 px-3 py-2 text-xs shadow hover:bg-white"
                    >
                      Flip
                    </button>
                    <label className="rounded-full bg-white/80 px-3 py-2 text-xs shadow hover:bg-white cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files && onUpload(e.target.files[0])}
                      />
                      Upload
                    </label>
                  </div>
                  <button
                    onClick={startCaptureSequence}
                    className="h-12 w-12 rounded-full bg-[hsl(var(--mood-primary))] shadow-md active:scale-95 transition"
                    aria-label="Take photo sequence"
                  />
                </div>
              </div>
            ) : (
              <PolaroidPreview
                images={capturedUrls.length ? capturedUrls : capturedUrl ? [capturedUrl] : []}
                frameKey={frameKey}
                quote={quote}
                filterCss={filterCss}
              />
            )}
          </section>

          {/* Controls */}
          <section className="rounded-2xl bg-white/70 shadow-lg ring-1 ring-black/5 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2 flex items-center justify-between gap-2">
                <p className="text-xs text-[hsl(var(--mood-muted-ink))]">Quotes are randomly selected for you — feel the good vibes ✿</p>
                <div className="flex gap-2">
                  {FRAMES.map(f => (
                    <button key={f.key} onClick={() => setFrameKey(f.key)} className={`rounded-md px-3 py-2 text-xs ${frameKey===f.key?"bg-[hsl(var(--mood-primary))] text-white":"bg-white"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>


              <div className="col-span-2 flex items-center justify-between gap-2 pt-1">
                {!active ? (
                  <span className="text-xs text-[hsl(var(--mood-muted-ink))]">Tip: You can upload if the camera is blocked.</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={retake} className="rounded-md px-3 py-2 bg-white ring-1 ring-black/5 shadow">Retake</button>
                    <button onClick={onDownload} disabled={busy} className="rounded-md px-3 py-2 bg-[hsl(var(--mood-primary))] text-white shadow disabled:opacity-50">Download</button>
                    <button onClick={onShare} disabled={busy} className="rounded-md px-3 py-2 bg-[hsl(var(--mood-secondary))] text-[hsl(var(--mood-secondary-ink))] shadow disabled:opacity-50">Share</button>
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

function PolaroidPreview({ images, frameKey, quote, filterCss }: { images: string[]; frameKey: string; quote: string; filterCss: string }) {
  const imgs = images.slice(0,2);
  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Polaroid card */}
      <div className="relative rounded-xl bg-white p-3 shadow-xl">
        <div className="absolute -top-3 left-8 h-6 w-32 rotate-[-6deg] rounded bg-[#F2D9DA]/80 shadow" />
        <div className="absolute -top-4 right-10 h-6 w-28 rotate-[8deg] rounded bg-[#D9EEF2]/80 shadow" />
        <div className="overflow-hidden rounded-md border border-black/5 bg-black/5 p-2">
          {frameKey === 'twin' ? (
            <div className="flex gap-2">
              {imgs.map((src, i) => (
                <div key={i} className="w-1/2 overflow-hidden rounded-sm">
                  <img src={src} className="h-40 w-full object-cover" style={{ filter: filterCss }} alt={`shot-${i}`} />
                </div>
              ))}
            </div>
          ) : frameKey === 'strip' ? (
            <div className="flex flex-col gap-2">
              {imgs.map((src,i) => (
                <div key={i} className="w-full overflow-hidden rounded-sm">
                  <img src={src} className="h-44 w-full object-cover" style={{ filter: filterCss }} alt={`shot-${i}`} />
                </div>
              ))}
            </div>
          ) : (
            // polaroid - place two mini photos side-by-side inside main frame
            <div className="flex gap-2">
              {imgs.length === 2 ? (
                <>
                  <div className="w-1/2 overflow-hidden rounded-sm">
                    <img src={imgs[0]} className="h-44 w-full object-cover" style={{ filter: filterCss }} alt="left" />
                  </div>
                  <div className="w-1/2 overflow-hidden rounded-sm">
                    <img src={imgs[1]} className="h-44 w-full object-cover" style={{ filter: filterCss }} alt="right" />
                  </div>
                </>
              ) : (
                <div className="w-full overflow-hidden rounded-sm">
                  <img src={imgs[0]} className="h-56 w-full object-cover" style={{ filter: filterCss }} alt="single" />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="pt-4">
          <p className="font-typewriter text-[17px] leading-6 text-stone-800">
            “{quote}”
          </p>
          <div className="mt-2 text-right">
            <span className="font-hand text-stone-500 text-base">MoodBooth.app</span>
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
    // source is wider
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

function drawTape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  radius = 6,
  rotation = 0,
) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);
  const rx = 1.5;
  ctx.beginPath();
  ctx.moveTo(rx, 0);
  ctx.lineTo(w - rx, 0);
  ctx.quadraticCurveTo(w, 0, w, rx);
  ctx.lineTo(w, h - rx);
  ctx.quadraticCurveTo(w, h, w - rx, h);
  ctx.lineTo(rx, h);
  ctx.quadraticCurveTo(0, h, 0, h - rx);
  ctx.lineTo(0, rx);
  ctx.quadraticCurveTo(0, 0, rx, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.restore();
}
