import Image from "next/image";

type Props = {
  src?: string;          // optional; if provided we render the image
  alt?: string;
  size?: number;         // px
  name?: string;         // new prop for your name
};

export default function CenterIcon({ src, alt = "icon", size = 140}: Props) {
  const dim = { width: size, height: size };

  return (
    <div className="flex flex-col items-center gap-4">
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="rounded-full shadow-lg object-cover"
          priority
        />
      ) : (
        <div
          aria-label="center icon placeholder"
          className="rounded-full ring-2 ring-white shadow-lg"
          style={dim}
        />
      )}
        <p className="mt-2 text-sm md:text-lg text-gray-200/95 italic font-semibold">
          hi! my name is ethan mckissic
        </p>
    </div>
  );
}
