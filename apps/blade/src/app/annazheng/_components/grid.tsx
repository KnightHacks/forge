import Image from "next/image";

const animeList = [
    {
        name: "JoJo's Bizarre Adventure",
        src: "/assets/anime/jojo.jpg",
    },
    {
        name: "Erased",
        src: "/assets/anime/erased.jpg",
    },
    {
        name: "Steins;Gate",
        src: "/assets/anime/steinsgate.jpg",
    },
    {
        name: "Attack on Titan",
        src: "/assets/anime/aot.jpg",
    },
    {
        name: "Frieren: Beyond Journey's End",
        src: "/assets/anime/frieren.jpg",
    },
    {
        name: "Demon Slayer",
        src: "/assets/anime/demonslayer.jpg",
    },
];

export default function AnimeGrid() {
    return (
        <div className="relative w-full max-w-[500px] h-auto flex flex-col bg-[#91B786] border-8 border-double border-[#565939] rounded-xl shadow-lg overflow-visible p-6">
            <h2 className="text-2xl font-bold underline">TO-WATCH LIST</h2>
            <div className="grid grid-cols-3 place-items-center justify-center gap-3 p-2">
                {animeList.map((anime) => (
                    <>
                        <Image 
                            key={anime.name}
                            src={anime.src}
                            alt={anime.name}
                            width={150}
                            height={225}
                        />
                    </>
                ))}
            </div>

            <Image
                src="/assets/chiikawa-touched.gif"
                alt="Usagi"
                width={100}
                height={100}
                className="absolute -top-10 -left-10 pointer-events-none"
                unoptimized
            />
        </div>
    );
}