interface ImageFlipCardProps {
  frontImage: string;
  backImage: string;
  frontAlt?: string;
  backAlt?: string;
  className?: string;
}

const ImageFlipCard = ({
  frontImage,
  backImage,
  frontAlt = "Front Image",
  backAlt = "Back Image",
}: ImageFlipCardProps) => {
  return (
    <div className="group relative mb-3 h-48 w-48 rounded-full border-2 border-white [perspective:1000px] md:mb-9">
      <div className="relative h-full w-full transform-gpu rounded-full shadow-xl transition-all duration-500 will-change-transform [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        <div className="absolute inset-0 transition-opacity duration-500 [backface-visibility:hidden] group-hover:opacity-0">
          <img
            className="h-full w-full rounded-full object-cover shadow-xl shadow-black/40"
            src={frontImage}
            alt={frontAlt}
          />
        </div>

        <div className="absolute inset-0 h-full w-full rounded-full bg-black/80 opacity-0 transition-opacity delay-200 duration-300 [backface-visibility:hidden] [transform:rotateY(180deg)] group-hover:opacity-100">
          <img
            className="h-full w-full rounded-full object-cover shadow-xl shadow-black/40"
            src={backImage}
            alt={backAlt}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageFlipCard;
