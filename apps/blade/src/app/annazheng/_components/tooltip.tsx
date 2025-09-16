import Image from "next/image";

export default function ToolTip({ x, y, img, text, className="" }: { x:number; y:number; img:string; text:string; className?: string }) {
    return (
        <div 
            style={{
                position: "fixed", // fixed to follow cursor outside parent
                top: y - 30, // offset slightly from cursor
                left: x + 15,
                pointerEvents: "none", // avoid interfering with hover/click
                zIndex: 9999,
            }}
            className={`
                bg-[#D8EAFF] text-[#83AA7E] font-semibold p-1
                border-[#565939] border-4 border-double rounded-md shadow-lg
                transition-opacity duration-200 ease-out flex items-center gap-2
                ${className}
            `}
        >
            {img && 
                <Image 
                    src={img}
                    alt=""
                    width={45}
                    height={45}
                />
            }
            <span>{text}</span>
        </div>
    );
}