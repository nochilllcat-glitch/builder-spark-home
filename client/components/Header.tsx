import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-[hsl(var(--mood-bg))]/80 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--mood-bg))]/60">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl px-4">
        <div className="py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-6 w-6 rounded-md bg-[hsl(var(--mood-primary))] shadow-sm" />
            <span className="font-display text-xl tracking-wider">Smile Booth</span>
          </Link>
          <span className="text-xs text-[hsl(var(--mood-muted-ink))]">spread joy ✿</span>
        </div>
      </div>
    </header>
  );
}
