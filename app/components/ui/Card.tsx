interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 transition-[border-color] duration-200 ${
        hover ? "[@media(hover:hover)_and_(pointer:fine)]:hover:border-[#3F3F46]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
