import NavButton from "../components/NavButton";

export default function Orange() { // yo this kinda peeled...
    return (
        <div className="relative bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500">
            <NavButton check={false} />

            <div className="h-screen text-white text-lg lg:text-2xl flex flex-col justify-center items-center mx-40">
                <p>
                    Since I made my first application, I've taked POOSD and actually learned React a little bit.
                    I was mainly on the back-end side of things though, I setup the email verification aspect and managed the MongoDB database.
                    Most of my time was spent figuring out the animation in the main page (gurt). There's more stuff I could add,
                    like some skills that gradually change color when you click em and cards that pop up and make a modal box when
                    clicked, but I started this way later and also got caught up in a bunch of random side-quests this weekend LMAO.
                    
                </p>

                <p>
                    Peep my {" "}
                    <a 
                        className="underline italic text-blue-400" 
                        href="https://github.com/buhgowsh/svelte-portfolio" 
                        target="_blank"
                    >
                        svelte-portfolio
                    </a>
                    {" "} repo if you want to see the stuff I'm talking about, it'll be decent when it's done.
                </p>
            </div>
        </div>
    );
};