import "../../styles/globals.css";

interface TextBoxProps {
    width?: string;
    height?: string;
    children: React.ReactNode;
    className?: string;
}

const TextBox = ({ width, height, children, className }: TextBoxProps) => {
    return (
        <div className={`flex flex-col items-center justify-center group relative ${className || ''}`} style={{ width: width || '', height: height || '' }}>
            <div
                className="flex items-center justify-center bg-[#F7F0C6] rounded-none px-5 py-4 sm:py-6 md:py-8 sm:px-10 md:px-16 tk-ccmeanwhile 
                            relative transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 outline-black outline-2 -outline-offset-3 w-full h-full"
            >
                <div className="text-center text-lg sm:text-xl md:text-2xl lg:text-3xl">
                    {children}
                </div>
            </div>
            <div 
                className="absolute top-0 left-0 bg-black rounded-none -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-100 w-full h-full"
            />
        </div>
    );
};

export default TextBox;