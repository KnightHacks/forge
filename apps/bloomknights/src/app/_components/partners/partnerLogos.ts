import GeminiSVG from "../graphics/gemini";
import GeminiWSVG from "../graphics/geminiW";
import GithubBSVG from "../graphics/githubB";
import GithubWSVG from "../graphics/githubW";
import MLHWSVG from "../graphics/mlhW";
import OneethosSVGW from "../graphics/oneethosW";

export const partnerLogos = [
  {
    name: "OneEthos",
    white: OneethosSVGW,
    color: OneethosSVGW,
    link: "https://www.oneethos.com/",
  },
  {
    name: "Google Gemini",
    white: GeminiWSVG,
    color: GeminiSVG,
    link: "https://aistudio.google.com/prompts/new_chat",
  },
  {
    name: "Major League Hacking",
    white: MLHWSVG,
    color: MLHWSVG,
    link: "https://mlh.io/",
  },
  {
    name: "GitHub Education",
    white: GithubWSVG,
    color: GithubBSVG,
    link: "https://github.com/settings/education/benefits",
  },
];
