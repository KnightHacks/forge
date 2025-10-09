export default function CoolButton({
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
      className={`group relative z-10 overflow-hidden rounded-lg bg-gradient-to-r from-purple-800 to-purple-900 px-6 py-3 font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95 ${className}`}
    >
      <span className="relative z-10 flex items-center">{label}</span>
      <span className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-white/10 blur-sm transition-transform duration-500 ease-in-out group-hover:translate-x-[100%]" />
    </button>
  );
}
