import Link from "next/link";
import { LucideFileText, LucideGlobe } from "lucide-react";
import { FaGithubAlt, FaLinkedinIn } from "react-icons/fa";
import Image from "next/image";

type socialLink = {
    href: string;
    label: string;
    icon: React.ElementType; // works for both react-icons + lucide-react
}

const socialLinks: socialLink[] = [
    {
        href: "https://www.linkedin.com/in/anna-zhengg/",
        label: "LinkedIn",
        icon: FaLinkedinIn,
    },
    {
        href: "https://github.com/crimzxun/",
        label: "GitHub",
        icon: FaGithubAlt,
    },
    {
        href: "/assets/resume.pdf",
        label: "Resume",
        icon: LucideFileText,
    },
    {
        href: "https://annazheng.vercel.app/",
        label: "Portfolio",
        icon: LucideGlobe,
    },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
    return (
        <>
            {socialLinks.map(({ href, label, icon: Icon }) =>
                <li key={label}>
                    <Link
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        onClick={onClick}
                        className="px-2 py-1 text-xl flex items-center transform hover:scale-110 hover:text-[#698C64]"
                    >
                        <Icon className="w-8 h-8" />
                    </Link>
                </li>
            )}
        </>
    );
}

export default function Navbar() {
    return (
        <nav className="w-full flex items-center justify-between p-4 bg-[#D8EAFF] text-[#83AA7E] shadow-[0_4px_0_0_#83AA7E]">
            <div className="flex items-center gap-2">
                <Image
                    src="/assets/hachiware.gif"
                    alt="Hachiware"
                    width={50}
                    height={50}
                    className=""
                    unoptimized
                />
                <span className="flex text-3xl font-bold transform hover:scale-110 hover:underline hover:underline-offset-4 hover:text-[#698C64]">
                    Good day to be Coding ◡̈
                </span>
            </div>
            <ul className="flex items-center gap-4">
                <NavLinks />
            </ul>   
        </nav>
    );
}