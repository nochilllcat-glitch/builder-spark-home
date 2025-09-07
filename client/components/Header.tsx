import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-[hsl(var(--mood-bg))]/80 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--mood-bg))]/60">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl px-4">
        <div className="py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-[hsl(var(--mood-primary))] to-[hsl(var(--mood-secondary))] shadow-sm cute-badge">😊</span>
            <div>
              <div className="font-display text-xl tracking-wider">Smile Booth</div>
              <div className="text-xs text-[hsl(var(--mood-muted-ink))] -mt-0.5">smile & share ✿</div>
            </div>
          </Link>
          <div className="hidden md:block" />
        </div>
      </div>
    </header>
  );
}
