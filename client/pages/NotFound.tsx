import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--mood-bg))] text-[hsl(var(--mood-ink))]">
      <div className="text-center p-6 rounded-2xl bg-[hsl(var(--paper))] shadow ring-1 ring-black/5">
        <h1 className="text-4xl font-display mb-2">404</h1>
        <p className="text-base text-[hsl(var(--mood-muted-ink))] mb-4">Oops! Page not found</p>
        <a href="/" className="inline-block rounded-md bg-[hsl(var(--mood-primary))] px-4 py-2 text-sm text-stone-800 shadow">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
