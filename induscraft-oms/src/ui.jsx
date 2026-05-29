export function Badge({ children, variant = "gray" }) {
  const styles = {
    blue: { background: "#E6F1FB", color: "#0C447C" },
    amber: { background: "#FAEEDA", color: "#633806" },
    green: { background: "#EAF3DE", color: "#27500A" },
    red: { background: "#FCEBEB", color: "#791F1F" },
    gray: { background: "#F1EFE8", color: "#444441" },
    teal: { background: "#E1F5EE", color: "#085041" },
    purple: { background: "#EEEDFE", color: "#3C3489" },
    coral: { background: "#FAECE7", color: "#712B13" },
  };
  return (
    <span style={{
      display: "inline-block", fontSize: 11, padding: "2px 8px",
      borderRadius: 7, fontWeight: 500, ...styles[variant]
    }}>{children}</span>
  );
}

export function channelVariant(channel) {
  return { Bangalore: "blue", Pune: "gray", Jodhpur: "teal", Website: "blue", Wholesale: "purple" }[channel] || "gray";
}

export function stageVariant(stageIndex) {
  if (stageIndex >= 8) return "green";
  if (stageIndex >= 5) return "teal";
  if (stageIndex >= 3) return "amber";
  return "gray";
}

export function delayStatus(order) {
  const item = order.items.find(i => i.originalDelivery !== i.currentDelivery);
  if (!item) {
    const overdue = order.items.some(i => {
      const exp = new Date(i.currentDelivery);
      return exp < new Date() && i.stageIndex < 8;
    });
    return overdue ? "overdue" : "on-track";
  }
  return "delayed";
}

export function Btn({ children, onClick, variant = "default", style = {} }) {
  const base = {
    fontSize: 12, padding: "7px 14px", borderRadius: 8,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-primary)",
    color: "var(--color-text-primary)", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 5,
    fontFamily: "inherit"
  };
  const variants = {
    danger: { borderColor: "#F09595", color: "#791F1F", background: "#FCEBEB" },
    primary: { background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none" },
    green: { background: "#EAF3DE", borderColor: "#97C459", color: "#27500A" },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...(variants[variant] || {}), ...style }}>
      {children}
    </button>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 12, padding: "14px 16px", ...style
    }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)",
      textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, ...style
    }}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, valueColor, sub }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: valueColor || "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Avatar({ initials, color = "blue", size = 36 }) {
  const colors = {
    blue: { bg: "#E6F1FB", fg: "#0C447C" },
    purple: { bg: "#EEEDFE", fg: "#3C3489" },
    teal: { bg: "#E1F5EE", fg: "#085041" },
    coral: { bg: "#FAECE7", fg: "#712B13" },
    green: { bg: "#EAF3DE", fg: "#27500A" },
    info: { bg: "var(--color-background-info)", fg: "var(--color-text-info)" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: c.bg, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.33,
      fontWeight: 500, color: c.fg, flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

export function DelayDot({ status }) {
  const colors = { "on-track": "#639922", "delayed": "#BA7517", "overdue": "#E24B4A" };
  return (
    <span style={{
      width: 8, height: 8, borderRadius: "50%",
      background: colors[status] || "#888", display: "inline-block", marginRight: 5
    }} />
  );
}

export function formatCurrency(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function MiniPipeline({ stageIndex, total = 9 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
            background: i < stageIndex ? "#639922" : i === stageIndex ? "#BA7517" : "var(--color-background-secondary)",
            border: `1.5px solid ${i < stageIndex ? "#639922" : i === stageIndex ? "#BA7517" : "var(--color-border-secondary)"}`,
          }} />
          {i < total - 1 && (
            <div style={{ flex: 1, height: 2, background: i < stageIndex ? "#639922" : "var(--color-border-tertiary)" }} />
          )}
        </div>
      ))}
    </div>
  );
}
