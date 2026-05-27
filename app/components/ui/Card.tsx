interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 ${
        hover ? "hover:border-[#3F3F46] transition-colors duration-150" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
