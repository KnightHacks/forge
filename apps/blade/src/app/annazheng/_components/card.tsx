import Image from "next/image";

type CardProps = {
    title?: string;
    description?: string[];
    topleft: string;
    bottomright: string;
    youtubeUrl?: string;
    img?: string;
    imgSize?: number;
};

export default function Card({ title, description, topleft, bottomright, youtubeUrl, img, imgSize=300 }: CardProps) {
    return (
        <div className="relative w-full max-w-[500px] h-auto flex flex-col bg-[#91B786] border-8 border-double border-[#565939] rounded-xl shadow-lg overflow-visible p-6"> 
            {title && (
                <h2 className="text-2xl font-bold underline">
                    {title}
                </h2>
            )}

            {description && description.map((desc, idx) => (
                <p key={idx} className="text-start mt-2">
                    {desc}
                </p>
            ))}

            {youtubeUrl && (
                <div className="mt-4 w-full aspect-video">
                    <iframe
                        className="w-full h-full rounded-md"
                        src={youtubeUrl}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            )}

            <div className="flex items-center justify-center">
                {img && (
                    <Image
                        src={img}
                        alt="in-box image"
                        width={imgSize}
                        height={imgSize}
                        className=""
                        unoptimized
                    />
                )}
            </div>
                  
            <Image
                src={topleft}
                alt="top-right deco"
                width={100}
                height={100}
                className="absolute -top-10 -left-10 pointer-events-none"
                unoptimized
            />

            <Image
                src={bottomright}
                alt="bottom-right deco"
                width={120}
                height={120}
                className="absolute -bottom-12 -right-12 pointer-events-none"
                unoptimized
            />
        </div>
    );
}