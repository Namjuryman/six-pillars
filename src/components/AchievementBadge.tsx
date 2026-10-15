type BadgeProps = {
  status: "locked" | "unlocked";
  icon?: string;
};

/** State text is always present; color is never the sole indication. */
export function AchievementBadge({ status, icon = "✦" }: BadgeProps) {
  const label = status === "unlocked" ? "已点亮" : "未点亮";

  return (
    <span className={`achievement-badge achievement-badge--${status}`}>
      <span className="achievement-badge__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="achievement-badge__label">{label}</span>
    </span>
  );
}
