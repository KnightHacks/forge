import { ArrowRight } from "lucide-react";

export default function CoolButton2({
  label,
  onClick,
  className,
  style,
}: {
  label: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={style}
      className={`
        relative z-10 overflow-hidden group 
        bg-gradient-to-r from-purple-800 to-purple-900 text-white 
        px-6 py-3 font-semibold rounded-full 
        transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95
        ${className}`}
    >
      <span className="relative z-10 flex items-center gap-2">
        {label}
        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
      </span>
      <span className="absolute inset-0 bg-white/10 blur-sm translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out pointer-events-none" />
    </button>
  );
}
