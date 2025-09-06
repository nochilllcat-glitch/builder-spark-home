import { Link } from "react-router-dom";

export default function Welcome() {
  return (
    <div className="min-h-screen bg-[hsl(var(--mood-bg))] text-[hsl(var(--mood-ink))] flex items-center justify-center">
      <div className="max-w-lg w-full px-6 py-12 text-center">
        <h1 className="text-5xl font-display mb-4">Smile Booth</h1>
        <p className="text-lg text-[hsl(var(--mood-muted-ink))] mb-6">Welcome — capture two quick photos, get a cozy Polaroid frame, and share a tiny moment of joy.</p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/capture" className="rounded-lg bg-[hsl(var(--mood-primary))] px-8 py-3 text-white font-semibold shadow">Start</Link>
          <Link to="/capture" className="rounded-lg bg-[hsl(var(--mood-accent))] px-6 py-3 text-[hsl(var(--mood-accent-ink))] font-semibold shadow">Upload</Link>
        </div>
        <p className="mt-6 text-xs text-[hsl(var(--mood-muted-ink))]">No photos leave your device. Everything happens in your browser.</p>
      </div>
    </div>
  );
}
