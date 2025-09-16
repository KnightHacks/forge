import Card from "./_components/card";
import GifCarousel from "./_components/gifcarousel";
import Navbar from "./_components/navbar";
import AnimeGrid from "./_components/grid";
import Slider from "./_components/slider";

// color palette:
// light-blue: #D8EAFF
// blue: #75A3BD
// light-green: #91B786
// green: #83AA7E
// dark-green: #698C64
// brown-green: #565939
// pink: #F8BBD0

export default function AnnaPage() {
    return (
        <div className="w-full min-h-screen flex flex-col bg-[url('/assets/chiikawa-wp-tree.jpg')] bg-cover bg-center">
            <Navbar />
            <GifCarousel img="/assets/chiikawa-happysprint.gif" size={120} audio="/assets/audio/ksibeblessed.mp3" />

            <main className="flex flex-grow justify-center gap-8 text-center px-8 pb-8">
                <div className="flex flex-col space-y-10 p-4">
                    <Card 
                        title="TO-DO LIST"
                        description={["1. do projects", "2. practice leetcode", "2. study", "4. relax & watch the Demon Slayer",]}
                        topleft="/assets/hachiware-uwu.gif"
                        bottomright="/assets/momonga-chiikawa.gif"
                    />

                    <Card 
                        title="NEED MOTIVATION?"
                        description={[
                            "Listen to the most energetic of the crew, Usagi. This 1-hour long of Usagi's singing will bring you the outmost joy and peace that you will ever need. It will bring forth your energy and makes you motivated to do anything that you were meant to do today. You might think what the heck am I doing, but once you listen to this 1-hour long chorus, it will direct you to the light, clear your mind, and guide you to what you are meant to do today. Usagi will be your savior in desperate times once you immersed in his melodic singing. You will suddenly feel light as if all the weight is lifted from your shoulder and then shall your mind be direct with you. If you read this far, apologies for this jibberish. May you be bless forever and never. May you be cleared of stress and confusion.",
                            "Amen."
                        ]}
                        topleft="/assets/usagi-dance.gif"
                        bottomright="/assets/usagi-jabdance.gif"
                        youtubeUrl="https://www.youtube.com/embed/9tD5kbzDxRA?si=i_wwvwl3yzB2Yk9d"
                        img="/assets/usagi-greet.gif"
                        imgSize={400}
                    />
                </div>
                
                <div className="flex flex-col space-y-10 p-4">
                    <Card 
                        title="UI THOUGHTS"
                        description={[
                            "YESSSS CAT GIFS HWEHEHWHEHWHE ok sorry",
                            "oooooooo carousel yess, song links???? video links???? hmmmm some interactibility (hopeully i spelled correctly lolll), some fade-ins, slidings, pop-outs, rotations when hover???",
                            "background animation maybe mayhaps prolly¿ sakuras flowing across the screen??",
                            "side bars maybe like the old (not old old) websites with ads but cat gifs instead???",
                        ]}
                        topleft="/assets/chiikawa-hmm.gif"
                        bottomright="/assets/usagi-rest.gif"
                    />

                    <AnimeGrid />

                    <div>
                        <Slider />
                    </div>
                </div>
            </main>

            <GifCarousel img="/assets/remia-gwenchana.gif" size={90} audio="/assets/audio/gwenchanadingdingding.mp3" />
        </div>
    );
}