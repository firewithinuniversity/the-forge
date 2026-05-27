interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">{title}</h1>
        {description && <p className="text-sm text-[#A1A1AA] mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}
