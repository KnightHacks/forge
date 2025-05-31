import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@forge/ui/accordion";
import FaqSVG from "./faq-svg";
import Link from "next/link";

interface FaqLink {
  text: string;
  href: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  links?: FaqLink[];
}

const faqData: FaqItem[] = [
  {
    id: "1",
    question: "What is A Hackathon?",
    answer: "A hackathon is a weekend-long event where students come together to learn the latest technologies and build innovative projects. These projects can range from involving web or mobile development to building a hardware project, or anything in between. Hackathons are a great way to learn new skills, meet new people, and have fun! Additionally, throughout the weekend we will be hosting workshops, fun social events, networking opportunities with sponsors, free food & swag, and so much more."
  },
  {
    id: "2",
    question: "How long is Knight Hacks?",
    answer: "Knight hacks is a 36-hour hackathon, beginning at 5pm on Friday (check-in runs from 5-8pm, with the opening ceremony starting at 8pm) and ending at 6pm on Sunday. We encourage you to work on your project for as long as you can during this time."
  },
  {
    id: "3",
    question: "Who can Attend?",
    answer: "If you're currently a college student or have graduated in the past year, you're more than welcome to attend! Even beginners are able to attend."
  },
  {
    id: "4",
    question: "How much experience do I need?",
    answer: "None! We welcome students from all academic backgrounds and skill levels, so don't be afraid to come and join us! We'll have introductory workshops for you to learn new skills, industry mentors to help you out, and great tools to build your projects. Whether you've never coded before or have lots of experience, there's a place for you at Knight Hacks!"
  },
  {
    id: "5",
    question: "Do I need a team?",
    answer: "Not at all! You can be a lone wolf, come with a team (no more than four people), or join some teams at Knight Hacks. We'll also have team building activities to help you find the right teammates!"
  },
  {
    id: "6",
    question: "How much does it cost?",
    answer: "Nothing! That's right, Knight Hacks is entirely free for all attendees to participate. All you need to worry about is learning new skills, developing cool projects, and having fun!"
  },
  {
    id: "7",
    question: "What can I build?",
    answer: "Anything your heart desires! Whatever you're interested in we will support it. We have five tracks that will have extra resources, sponsored challenges, and other events to inspire you and prepare you. Check out our previous devpost for examples of what participants built in the past!!"
  },
  {
    id: "8",
    question: "My question wasn't answered, where can I ask?",
    answer: "Here's the link to the hackers guide. If a question wasn't answered feel free to ask in the ",
    links: [
      { text: "hackers guide", href: "#" },
      { text: "Discord", href: "#" }
    ]
  },
  {
    id: "9",
    question: "Where can I sleep?",
    answer: "We provide designated quiet rooms for attendees to rest during the event. Feel free to bring a sleeping bag, blanket, or anything that helps you feel comfortable. Just make sure to take care of yourself and get rest when you need it!"
  },
  {
    id: "10",
    question: "What should I bring?",
    answer: "Bring your laptop, charger, any hardware you want to use, a reusable water bottle, and toiletries if you're staying overnight. Also consider bringing comfy clothes, a blanket, and whatever else keeps you cozy. We'll handle food and snacks!"
  },
  {
    id: "11",
    question: "Is food provided?",
    answer: "We provide free meals, snacks, and drinks throughout the event to keep you energized. We also accommodate dietary restrictions—just let us know during registration."
  },
  {
    id: "12",
    question: "Do I have to stay the whole time?",
    answer: "Nope! While we encourage you to stay for as much of the event as you can (so you don't miss out on the fun), you're free to come and go as needed."
  },
  {
    id: "13",
    question: "What if I've never been to a hackathon before?",
    answer: "That's totally fine; Knight Hacks is beginner-friendly! We have workshops, mentors, and a welcoming environment to help you get started and learn as you go."
  },
  {
    id: "14",
    question: "Can I use a past project or something I've built before?",
    answer: "Nope—projects must be started after the hackathon begins. You're welcome to brainstorm ideas or learn tools ahead of time, but actual work should begin during the event to keep it fair for everyone."
  },
  {
    id: "15",
    question: "Is Knight Hacks in person or virtual?",
    answer: "Knight Hacks is fully in-person! Everything from check-in to project submission to demos will happen at the venue. Make sure you're able to attend in-person before registering."
  }
];

export default function Faq() {
  return (
    <div className="relative z-10 flex h-full w-full justify-center px-4 mb-60 md:mb-70 lg:mb-95">
      <div className="relative w-[99%] md:w-[60%]">
        <div className="relative">
          <FaqSVG className="mb-5 h-40 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Column 1 */}
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqData.slice(0, 8).map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
                >
                  <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-slate-700">
                    {faq.links ? (
                      <>
                        {faq.answer.split("hackers guide").map((part, index, array) => (
                          <span key={index}>
                            {part}
                            {index < array.length - 1 && (
                              <Link href={faq.links?.[0]?.href ?? "#"} className="text-blue-600 hover:underline">
                                hackers guide
                              </Link>
                            )}
                          </span>
                        ))}
                        {" "}
                        <Link href={faq.links[1]?.href ?? "#"} className="text-blue-600 hover:underline">
                          Discord
                        </Link>
                        .
                      </>
                    ) : (
                      faq.answer
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqData.slice(8).map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
                >
                  <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-slate-700">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}
