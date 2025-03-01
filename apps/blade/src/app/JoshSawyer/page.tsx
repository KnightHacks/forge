import Link from 'next/link';
import './page.css';

function Application() {
    return (
        <div className="Application">

    		<header className="Introduction">
        		<p id="vro">
					𝓗𝓮𝓵𝓵𝓸<sub id="peeled">𝓻𝓪𝓷𝓰𝓮</sub> 𝓿𝓻𝓸...🍊🪒
        		</p>

        		<img src="pmo.png" className="pmo" alt="Peeling-My-Orange" />
    		</header>

			<img src="whimsical.png" className="needdat" alt="Cat-in-a-propeller-hat-licking-a-lolipop" />

			{/*I had Claude generate stuff for a contact me panel, then only ended up using the buttons*/}
			<div className="profile-links">

				<a href="https://www.linkedin.com/in/josh-sawyer-b765ab255" className="profile-link linkedin" target="_blank" rel="noopener noreferrer">
				<div className="icon">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
						<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/>
					</svg>
				</div>
				<span className="link-text">LinkedIn</span>
				</a>

				<a href="https://github.com/buhgowsh" className="profile-link github" target="_blank" rel="noopener noreferrer">
				<div className="icon">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
				</div>
				<span className="link-text">GitHub</span>
				</a>

				<a href="https://drive.google.com/file/d/1WYrZD0DD3eDpI2cIJDFu9Ms56QfYshLm/view?usp=drive_link" className="profile-link resume" target="_blank" rel="noopener noreferrer">
				<div className="icon">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
						<path d="M8 12h8v1H8zm0 2h8v1H8zm0 2h5v1H8z"/>
					</svg>
				</div>
				<span className="link-text">Resume</span>
				</a>
			</div>

			<div className='AboutMe'>
				<header id="Section">
					Who am I? 👋
				</header>

				<p id="yapping">
					I'm Josh! 🍷 (buhgowsh in the discord; I usually type my name as Jawsh though) I'm a sophomore looking to get more involved with Knight Hacks
					and gain experience with projects that actually affect people! Outside of that, I'm usually just joshing around or working on class assignments.
				</p>

				<header className="prettyPlease" id="Section">
					<Link href="/JoshSawyer/reasons">
        			    <i>Why I want to join! :D</i>
        			</Link>
				</header>

				<p id="yapping">
					I've been wanting to gain some more experience outside of the classroom, but I haven't made any progress on anything.
					Filling out this application, even though this page is kinda doodiebuns, was surprisingly fun!
					I've never worked with TypeScript, HTML, or CSS before so this was a neat learning experience!
					Even though I won't have complete freedom to make pages as goofy as this one, I think I'd still enjoy creating something that people use.
					Something I'm interested in trying out is adding the Blade QR code to the Apple Wallet similar to the way Hack@UCF does.
					(idk if the QR code would work though)
					Especially since knowing other people will view/use what I make means I need to make something worth going to.
				</p>

				<header id="Section">
					Relevant Experience 💻
				</header>

				<p id="yapping">
					I worked with a small group of three people to make a simple contact manager for the POOSD Small Project,
					the presentation of our work can be found <a className="presentationLink" id="presentation" href="https://drive.google.com/file/d/1F7KvkwQGtMxDy-lU084TjlIYsAum7fKG/view?usp=drive_link">here</a>.
					(We deleted the server that was hosting the website so it isn't accessible anymore, but the files are on my GitHub in The-Coral-Collection repo)
					I was in charge of the Database and worked on almost half of the APIs (DeleteContact, SignUp, and VerifyUsername were the APIs I worked on).
					We used MySQL as our Database and PHP for the APIs.
					I never ended up touching the Front-End, but I am for the Large Project so I can bring my experience from both worlds to help where I'm needed. 
				</p>
			</div>
		</div>
    );
}

export default Application;
