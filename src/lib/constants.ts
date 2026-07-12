export const CATEGORIES = [
  { value: "electricity", label: "Electricity" },
  { value: "water_supply", label: "Water Supply" },
  { value: "road_damage", label: "Road Damage" },
  { value: "garbage", label: "Garbage" },
  { value: "municipality", label: "Municipality" },
  { value: "police", label: "Police" },
  { value: "cyber_crime", label: "Cyber Crime" },
  { value: "transport", label: "Transport" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "others", label: "Others" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];
export type PriorityValue = (typeof PRIORITIES)[number]["value"];
export type StatusValue = (typeof STATUSES)[number]["value"];

export const statusLabel = (v: string) => STATUSES.find((s) => s.value === v)?.label ?? v;
export const categoryLabel = (v: string) => CATEGORIES.find((s) => s.value === v)?.label ?? v;
export const priorityLabel = (v: string) => PRIORITIES.find((s) => s.value === v)?.label ?? v;

export const statusColor = (v: string) => {
  switch (v) {
    case "pending": return "bg-warning/15 text-warning border-warning/30";
    case "assigned": return "bg-info/15 text-info border-info/30";
    case "in_progress": return "bg-accent/15 text-accent border-accent/30";
    case "resolved": return "bg-success/15 text-success border-success/30";
    case "rejected": return "bg-destructive/15 text-destructive border-destructive/30";
    case "closed": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground";
  }
};

export const priorityColor = (v: string) => {
  switch (v) {
    case "low": return "bg-muted text-muted-foreground";
    case "medium": return "bg-info/15 text-info";
    case "high": return "bg-warning/15 text-warning";
    case "critical": return "bg-destructive/15 text-destructive";
    default: return "bg-muted";
  }
};
