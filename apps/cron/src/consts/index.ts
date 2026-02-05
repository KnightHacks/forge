export const DAILY_MESSAGES = [
  "Try not to TLE this time!",
  "Let's hope it's not a graph network flow DP problem...",
  "Don't use ChatGPT this time!",
  "👅",
  "May the bugs ever be in your favor!",
  "Don't use C for this one...",
  "Let's see who comes out victorious!",
  "Let's crack it together!",
  "Time to debug the day away!",
  "Today's challenge awaits!",
  "Let's code circles around Neetcode!",
  "Let's get to hacking!",
  "May your algorithms be swift and your bugs be minimal!",
  "Take a shower after this...",
  "Let's flex your brain muscles! 💪👅😈",
  "𝓛𝓮𝓽'𝓼 𝓬𝓸𝓭𝓮 𝓿𝓻𝓸 ❤️‍🔥⛓️👅",
  "I'm 𝓯𝓻𝓮𝓪𝓴𝔂 T.K! 🛡️👅",
];

export const DISCORD_LEETCODE_ROLE_ID = "1264645162060091483";

export const DISCORD_REMINDER_ROLE_ID = "1264770451578552401";

export const DISCORD_HACKATHON_ROLE_ID = "1408025502119231498";

export const DISCORD_PROD_GUILD_ID = "486628710443778071";

export const EVENT_BANNER_IMAGE = "https://i.imgur.com/Jr1cyxT.png";
export const HACK_BANNER_IMAGE = "https://i.imgur.com/lpTVNl7.png";

export const BUBBLE_WRAP_TEXT = "||pop||||pop||||pop||||pop||||pop||||pop||\n";

export const TK_CAPYBARA_URL = "https://api.capy.lol/v1/capybara?json=true";

export const TK_CAT_URL = "https://api.thecatapi.com/v1/images/search?limit=1";

export const TK_DOG_URL = "https://dog.ceo/api/breeds/image/random";

export const TK_DUCK_URL = "https://random-d.uk/api/v2/quack";

export const TK_FACTS_URL =
  "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en";

export const CS_FLOWCHART_URL =
  "https://blade.knighthacks.org/flowcharts/bs-cs.png";

export const IT_FLOWCHART_URL =
  "https://blade.knighthacks.org/flowcharts/bs-it.png";

export const CPE_FLOWCHART_URL =
  "https://blade.knighthacks.org/flowcharts/bs-cpe.png";

export const DS_FLOWCHART_URL =
  "https://blade.knighthacks.org/flowcharts/bs-ds.png";

export const TK_FOX_URL = "https://randomfox.ca/floof/";

export const TK_JOKE_URL =
  "https://v2.jokeapi.dev/joke/Programming?blacklistFlags=nsfw,religious,political,racist,sexist,explicit";

export const TK_KNIGHTHACKS_LINKTREE_URL = "https://linktr.ee/knighthacks";

export const TK_LEETCODE_API_URL =
  "https://alfa-leetcode-api.onrender.com/daily";

export const TK_LEETCODE_ICON_URL =
  "https://assets.leetcode.com/static_assets/public/images/LeetCode_logo_rvs.png";

export const LINKS = [
  "• [**Sign up for KnightHacks VII!**](https://2024.knighthacks.org/)",
  "• [**Pay your dues!**](https://square.link/u/ET1I7OVK)",
  "• [**Fill out our Membership Form!**](https://forms.gle/kLRWuHFWxkHFUs8s9)",
  "• [**Become a Kickstart Mentee!**](https://forms.gle/HYGt74TwpyDJAmYZ9)",
  "• [**Check out our events calendar!**](https://calendar.google.com/calendar/u/0/r?cid=Y18wYjlkZjJiMDA2MmE1ZDcxMWZjMTYwNjBmZjMyODZlZjQwNGIxNzRiZmFmYzRjYmRkNGUzMDA5ZTkxNTM2ZTk0QGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20)",
  "• [**Follow us on LinkedIn!**](https://www.linkedin.com/company/knight-hacks/posts/?feedView=all)",
  "• [**Follow us on Instagram!**](https://www.instagram.com/knighthacks)",
  "[*For more links...*](https://linktr.ee/knighthacks)",
];

export const CHAT_RESPONSES = [
  "Hey there! Ready to tackle some code?",
  "Let's make magic happen today!",
  "Need a hand? T.K is here to help!",
  "Got a challenge? We've got this!",
  "Coding adventure awaits!",
  "Keep calm and code on!",
  "Every bug is a step closer to greatness!",
  "T.K at your service, friend!",
  "Let's build something amazing!",
  "Ready for a coding quest?",
  "Let's conquer this together!",
  "Always here to lend a hand!",
  "What's our mission today?",
  "Happy coding, my friend!",
  "Together, we're unstoppable!",
  "I cannot WAIT for Knight Hacks VII!",
  "Nothing a debugger can't fix...",
  "Ready to set sail? I sure am!",
  "Do you know how to sail? I sure don't!",
  "Dev team did a great job with my CV algorithm. You look great!",
  "Anyone know where Lenny is?",
];

export const EIGHTBALL_RESPONSES = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes, definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
  "The stars will most definitely grant your wish!",
  "01111001 01100101 01110011",
  "01101110 01101111",
  "Beep boop, cannot predict now.",
  "The stars in the milky way are blinking in a decidedly good fashion!",
  "Yeah that ain't happening.",
  "Bro that's definitely happening.",
];

export type WeatherMapKeys = Record<
  | "Clear"
  | "Clouds"
  | "Squall"
  | "Tornado"
  | "Ash"
  | "Dust"
  | "Sand"
  | "Fog"
  | "Haze"
  | "Smoke"
  | "Mist"
  | "Snow"
  | "Rain"
  | "Drizzle"
  | "Thunderstorm",
  string
>; // for easy key access in WEATHER_MAP

export const WEATHER_MAP: WeatherMapKeys = {
  Clear: ":sunny:",
  Clouds: ":cloud:",
  Squall: ":cloud:",
  Tornado: ":cloud_tornado:",
  Ash: ":volcano:",
  Dust: ":fog:",
  Sand: ":fog:",
  Fog: ":fog:",
  Haze: ":fog:",
  Smoke: ":fog:",
  Mist: ":fog:",
  Snow: ":cloud_snow:",
  Rain: ":cloud_rain:",
  Drizzle: ":white_sun_rain_cloud:",
  Thunderstorm: ":thunder_cloud_rain:",
};
