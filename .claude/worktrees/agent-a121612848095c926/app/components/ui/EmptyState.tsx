import Button from "./Button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1A1A1E] mb-4 text-[#52525B]">
        {icon}
      </div>
      <p className="text-sm text-[#A1A1AA] mb-1">{title}</p>
      <p className="text-xs text-[#52525B] mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
