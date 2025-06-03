import "../../styles/globals.css";

interface TextBoxProps {
    width?: string;
    height?: string;
    children: React.ReactNode;
}

const TextBox = ({ width, height, children }: TextBoxProps) => {
    return (
        <div className="flex flex-col items-center justify-center group relative">
            <div
                className="flex items-center justify-center bg-[#F7F0C6] rounded-none p-4 tk-ccmeanwhile 
                            relative transition-transform duration-200 group-hover:-translate-x-1 group-hover:-translate-y-1"
                style={{ width: width || '100%', height: height || '100%' }}
            >
                {children}
            </div>
            <div 
                className="absolute top-0 left-0 bg-black rounded-none -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-200"
                style={{ width: width || '100%', height: height || '100%' }}
            />
        </div>
    );
};

export default TextBox;