import { Link } from "@tanstack/react-router";
import { useGame } from "@/lib/game-store";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const balance = useGame((s) => s.balance);
  const theme = useGame((s) => s.theme);
  const sound = useGame((s) => s.sound);
  const toggleTheme = useGame((s) => s.toggleTheme);
  const toggleSound = useGame((s) => s.toggleSound);

  return (
    <header className="w-full border-b border-border/60 bg-background/60 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="inline-block w-7 h-7 rounded-md bg-gradient-to-br from-[var(--gold)] to-accent" />
          NOROC <span className="text-primary">JETX</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm ml-4">
          <NavLink to="/">Game</NavLink>
          <NavLink to="/fairness">Provably fair</NavLink>
          <NavLink to="/stats">Stats</NavLink>
        </nav>
        <div className="flex-1" />
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border">
          <span className="text-xs text-muted-foreground">Balance</span>
          <span className="font-mono-tabular font-semibold text-[var(--gold)]">
            {balance.toFixed(2)}
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={toggleSound} aria-label="Toggle sound">
          {sound ? "🔊" : "🔇"}
        </Button>
        <Button size="sm" variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? "🌙" : "☀️"}
        </Button>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
      activeProps={{ className: "text-foreground bg-secondary" }}
    >
      {children}
    </Link>
  );
}
