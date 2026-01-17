const items = [
  { label: "Available", cls: "bg-available border-border" },
  { label: "Routine class", cls: "bg-routine/25 border-routine/60" },
  { label: "Confirmed booking", cls: "bg-booked/25 border-booked/60" },
  { label: "Pending approval", cls: "bg-pending/20 border-pending/60 border-dashed" },
  { label: "Exam / Quiz", cls: "bg-exam/25 border-exam/60" },
  { label: "Event", cls: "bg-event/25 border-event/60" },
  { label: "Lunch & prayer", cls: "bg-lunch border-border" },
];

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`size-3 rounded-[4px] border ${i.cls}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
