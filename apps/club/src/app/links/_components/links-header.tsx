import FacebookSVG from "./assets/facebook";
import InstagramSVG from "./assets/instagram";
import KightHacksLogoSVG from "./assets/kh-logo";
import KightHacksTextSVG from "./assets/knighthacks-text";
import LinkedinSVG from "./assets/linkedin";
import MailSVG from "./assets/mail";
import TwitterSVG from "./assets/twitter";
import YoutubeSVG from "./assets/youtube";

const links = [
  {
    Icon: FacebookSVG,
    label: "Facebook",
    href: "https://www.facebook.com/KnightHacks/",
  },
  {
    Icon: InstagramSVG,
    label: "Instagram",
    href: "https://instagram.com/knighthacks",
  },
  {
    Icon: YoutubeSVG,
    label: "Youtube",
    href: "https://www.youtube.com/channel/UC_i6HblrGGeNdmKd1QbKlKg",
  },
  {
    Icon: LinkedinSVG,
    label: "Linkedin",
    href: "https://www.linkedin.com/company/knight-hacks",
  },
  { Icon: MailSVG, label: "Mail", href: "mailto:team@knighthacks.org" },
  { Icon: TwitterSVG, label: "Twitter", href: "https://x.com/knighthacks" },
];

export default function Header() {
  return (
    <div className="relative flex h-full w-screen flex-col items-center justify-center overflow-visible pb-[310px]">
      <div className="flex flex-col items-center text-center">
        <KightHacksLogoSVG className="absolute top-[50px] h-[600px] w-[600px] object-contain" />
        <KightHacksTextSVG className="absolute top-[180px] h-[230px] w-[230px] object-contain" />

        <div className="absolute top-[300px] flex flex-row items-center space-x-2 pr-2 align-middle">
          {links.map(({ Icon, label, href }) => (
            <a
              key={href}
              href={href}
              aria-label={label}
              className="transform transition-all duration-100 hover:scale-110"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon className="w-6" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
