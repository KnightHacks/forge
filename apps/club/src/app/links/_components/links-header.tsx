import KightHacksLogoSVG from "./assets/kh-logo";
import KightHacksTextSVG from "./assets/knighthacks-text";
import FacebookSVG from "./assets/facebook";
import TwitterSVG from "./assets/twitter";
import InstagramSVG from "./assets/instagram";
import YoutubeSVG from "./assets/youtube";
import LinkedinSVG from "./assets/linkedin";
import MailSVG from "./assets/mail";

const links = [
  {Icon: FacebookSVG, label: "Facebook", href: "https://www.facebook.com/KnightHacks/" },
  {Icon: InstagramSVG, label: "Instagram", href: "https://instagram.com/knighthacks" },
  {Icon: YoutubeSVG, label: "Youtube", href: "https://www.youtube.com/channel/UC_i6HblrGGeNdmKd1QbKlKg" },
  {Icon: LinkedinSVG, label: "Linkedin", href: "https://www.linkedin.com/company/knight-hacks" },
  {Icon: MailSVG, label: "Mail", href: "mailto:team@knighthacks.org" },
  {Icon: TwitterSVG, label: "Twitter", href: "https://x.com/knighthacks" },
]

export default function Header() {
  return (
    <div className="relative flex h-full w-screen flex-col overflow-visible items-center justify-center pb-[310px]">
        <div className="flex flex-col items-center text-center">
        <KightHacksLogoSVG className="absolute top-[50px] w-[600px] h-[600px] object-contain"/>
        <KightHacksTextSVG className="absolute top-[180px] w-[230px] h-[230px] object-contain"/>

        <div className="absolute top-[300px] flex flex-row align-middle items-center space-x-2 pr-2">
            {links.map(({Icon, label, href}) => (
              <a key={href} href={href} aria-label={label} className="transform hover:scale-110 transition-all duration-100" target="_blank" rel="noopener noreferrer">
                <Icon className="w-6" />
              </a>
            ))}
        </div>
      </div>
    </div>
  );
}
