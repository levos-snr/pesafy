import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/docs", label: "Overview" },
  { to: "/docs/express", label: "Express SDK" },
  { to: "/docs/react", label: "React Components" },
  { to: "/docs/mpesa-express", label: "M-Pesa Express" },
];

export default function DocsLayout() {
  return (
    <div className="flex gap-6">
      <aside className="w-52 shrink-0 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Documentation
        </h2>
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  "flex items-center rounded-lg px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                ].join(" ")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 max-w-3xl">
        <Outlet />
      </main>
    </div>
  );
}
