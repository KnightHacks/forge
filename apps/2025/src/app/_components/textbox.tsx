import "../../styles/globals.css";

interface TextBoxProps {
  width?: string;
  height?: string;
  children: React.ReactNode;
  className?: string;
  textSize?: string;
  centering?: string;
}

const TextBox = ({
  width,
  height,
  children,
  className,
  textSize = "text-lg sm:text-xl md:text-2xl lg:text-3xl",
  centering = "text-center",
}: TextBoxProps) => {
  return (
    <div
      className={`group relative flex flex-col items-center justify-center ${className || ""}`}
      style={{ width: width || "", height: height || "" }}
    >
      <div className="tk-ccmeanwhile relative flex h-full w-full items-center justify-center rounded-none bg-[#F7F0C6] px-5 py-4 outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 sm:px-10 sm:py-6 md:px-16 md:py-8">
        <div className={`${centering} ${textSize}`}>{children}</div>
      </div>
      <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
    </div>
  );
};

export default TextBox;
