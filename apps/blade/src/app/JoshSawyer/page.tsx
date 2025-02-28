import Link from 'next/link';

function Application() {
    return (
        <div className="Application">
    		<header className="Introduction">
        		<p>
        			Hello vro...
        		</p>
        		<img src="pmo.png" className="Peeling-My-Orange" alt="pmo" />
    		</header>

			<div className="LinkedIn Button">
				<a href="https://www.linkedin.com/in/josh-sawyer-b765ab255">
					<img src="logoedin.png" className="imagedIn" alt="linkedin" />
				</a>
				<a href="https://www.linkedin.com/in/josh-sawyer-b765ab255">
					<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
						LinkedIn
					</button>
				</a>
			</div>

    		<div className="Text">

				<a href="https://www.linkedin.com/in/josh-sawyer-b765ab255">
					<button className='button'>
						LinkedIn
					</button>
				</a>
				<br/>

        		<Link href="https://github.com/buhgowsh">
        		    GitHub
        		</Link>
				<br/>

				<Link href="https://drive.google.com/file/d/1WYrZD0DD3eDpI2cIJDFu9Ms56QfYshLm/view?usp=drive_link">
					Resume
				</Link>
				<br/>

				<Link href="https://drive.google.com/file/d/1F7KvkwQGtMxDy-lU084TjlIYsAum7fKG/view?usp=drive_link">
					Presentation
				</Link>
				<br/>

        		<Link href="/JoshSawyer/reasons">
        		    Reasons I want to join! :D
        		</Link>
    		</div>

			<div>
				<p>
					I'm Josh! (buhgowsh in the discord) I'm a sophomore looking to get more involved with Knight Hacks and gain experience that I can show off on my resume.
					I've known about JavaScript and TypeScript for a litle while, but I've never actually sat down and tried to learn it until now.
					This application was my first experience with HTML, CSS, and TypeScript React and regardless of if I make the cut or not this has been a great learning experience!
					Especially since I'm in POOSD currently and I'm on frontend for the large project, so getting started here will go a long way both potentially for the Dev Team and for my POOSD group.
				</p>
			</div>
		</div>
    );
}

export default Application;
