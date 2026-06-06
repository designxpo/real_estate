import Link from "next/link";

// Header for public marketing pages. CTA flips to "Dashboard" when a broker is
// already signed in (we never redirect — the homepage stays crawlable).
export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="h-16 flex items-center justify-between max-w-6xl mx-auto px-4 md:px-6">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center text-white font-bold">B</div>
        <span className="font-display text-lg font-semibold text-ink">Broker</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/explore" className="text-ink-muted hover:text-ink">Explore</Link>
        {signedIn ? (
          <Link href="/home" className="px-4 py-2 rounded-full bg-accent text-white">Dashboard</Link>
        ) : (
          <Link href="/login" className="px-4 py-2 rounded-full bg-accent text-white">Broker login</Link>
        )}
      </nav>
    </header>
  );
}
