import Link from "next/link";

export default function NavButton({check}: {check: boolean}) {
    return (
        // Choose word that's said based on given value in page
        <div className="relative flex justify-center text-white z-50">
            {check ? (
                <div>
                    <Link
                        className="text-7xl rounded transition delay-100 duration-300 ease-in-out hover:text-black"
                        href="/josh-sawyer/skills"
                    >
                        Yap
                    </Link>
                </div>
            ) : (
                <div>
                    <Link 
                        className="text-7xl rounded transition delay-100 duration-300 ease-in-out hover:text-black"
                        href="/josh-sawyer"
                    >
                        Main Page
                    </Link>
                </div>
            )}
        </div>
    );
};