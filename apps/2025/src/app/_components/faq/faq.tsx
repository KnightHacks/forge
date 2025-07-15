import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@forge/ui/accordion";
import Image from "next/image";
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
    question: "What is a Hackathon?",
    answer:
      "A hackathon is a weekend-long event where students come together to learn the latest technologies and build innovative projects. These projects can range from involving web or mobile development to building a hardware project, or anything in between. Hackathons are a great way to learn new skills, meet new people, and have fun! Additionally, throughout the weekend we will be hosting workshops, fun social events, networking opportunities with sponsors, free food & swag, and so much more.",
  },
  {
    id: "2",
    question: "How long is Knight Hacks?",
    answer:
      "Knight Hacks is a 36-hour hackathon, beginning at 5pm on Friday and ending at 6pm on Sunday. We encourage you to work on your project for as long as you can during this time.",
  },
  {
    id: "3",
    question: "Who can attend?",
    answer:
      "If you're currently a college student or have graduated in the past year, you're more than welcome to attend! Even beginners are able to attend.",
  },
  {
    id: "4",
    question: "How much experience do I need?",
    answer:
      "None! We welcome students from all academic backgrounds and skill levels, so don't be afraid to come and join us! We'll have introductory workshops for you to learn new skills, industry mentors to help you out, and great tools to build your projects. Whether you've never coded before or have lots of experience, there's a place for you at Knight Hacks!",
  },
  {
    id: "5",
    question: "Do I need a team?",
    answer:
      "Not at all! You can be a lone wolf, come with a team (no more than four people), or join some teams at Knight Hacks. We'll also have team building activities to help you find the right teammates!",
  },
  {
    id: "6",
    question: "How much does it cost?",
    answer:
      "Nothing! That's right, Knight Hacks is entirely free for all attendees to participate. All you need to worry about is learning new skills, developing cool projects, and having fun!",
  },
  {
    id: "7",
    question: "What can I build?",
    answer:
      "Anything your heart desires! Whatever you're interested in we will support it. We have five tracks that will have extra resources, sponsored challenges, and other events to inspire you and prepare you. Check out our previous Devpost for examples of what participants built in the past!",
  },
  {
    id: "8",
    question: "My question wasn't answered, where can I ask?",
    answer:
      "Here's the link to the Hacker's Guide. If a question wasn't answered feel free to ask in the ",
    links: [
      { text: "Hackers Guide", href: "https://knighthacks.org/hackers-guide" },
      { text: "Discord", href: "https://discord.knighthacks.org/" },
    ],
  },
  {
    id: "9",
    question: "Where can I sleep?",
    answer:
      "We provide designated quiet rooms for attendees to rest during the event. Feel free to bring a sleeping bag, blanket, or anything that helps you feel comfortable. Just make sure to take care of yourself and get rest when you need it!",
  },
  {
    id: "10",
    question: "What should I bring?",
    answer:
      "Bring your laptop, charger, any hardware you want to use, a reusable water bottle, and toiletries if you're staying overnight. Also consider bringing comfy clothes, a blanket, and whatever else keeps you cozy. We'll handle food and snacks!",
  },
  {
    id: "11",
    question: "Is food provided?",
    answer:
      "We provide free meals, snacks, and drinks throughout the event to keep you energized. We also accommodate dietary restrictions—just let us know during registration.",
  },
  {
    id: "12",
    question: "Do I have to stay the whole time?",
    answer:
      "Nope! While we encourage you to stay for as much of the event as you can (so you don't miss out on the fun), you're free to come and go as needed.",
  },
  {
    id: "13",
    question: "What if I've never been to a hackathon before?",
    answer:
      "That's totally fine; Knight Hacks is beginner-friendly! We have workshops, mentors, and a welcoming environment to help you get started and learn as you go.",
  },
  {
    id: "14",
    question: "Can I use a past project or something I've built before?",
    answer:
      "Nope—projects must be started after the hackathon begins. You're welcome to brainstorm ideas or learn tools ahead of time, but actual work should begin during the event to keep it fair for everyone.",
  },
  {
    id: "15",
    question: "Is Knight Hacks in person or virtual?",
    answer:
      "Knight Hacks is fully in-person! Everything from check-in to project submission to demos will happen at the venue. Make sure you're able to attend in-person before registering.",
  },
];

export default function Faq() {
  return (
    <div
      id="faqs"
      className="relative z-10 mt-40 mb-64 flex h-full min-h-screen w-full flex-col items-center sm:mb-60 md:mb-72 lg:mb-80 xl:mb-96"
    >
      <div className="relative z-10 mb-2 flex h-auto w-full items-center justify-center sm:mb-3 md:mb-4 lg:mb-6">
        <div className="relative flex w-[100%] items-center justify-center sm:w-[95%] md:w-[75%] lg:w-[70%] xl:w-[65%]">
          <Image
            src="/sponsorSectionSvgs/spikeything.svg"
            alt="spikeything"
            width={0}
            height={0}
            sizes="100vw"
            className="z-10 h-[80%] w-[80%] md:h-[60%] md:w-[60%]"
          />
          <span
            className="absolute top-1/2 left-1/2 z-20 mt-[1%] -translate-x-1/2 -translate-y-1/2 transform text-[6vw] text-[#d83434] sm:text-[5vw] md:text-[4vw] lg:text-[3vw] xl:text-[2.5vw]"
            style={{ fontFamily: '"The Last Shuriken"' }}
          >
            FAQS
          </span>
        </div>
      </div>
      <div className="w-full px-2 py-4">
        <div className="mx-auto max-w-7xl">
          {/* Mobile: Single column with all FAQs */}
          <div className="lg:hidden">
            <Accordion
              type="single"
              collapsible
              className="min-h-[900px] w-full space-y-3 sm:space-y-4"
            >
              {faqData.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="group relative overflow-hidden rounded-none border-0"
                >
                  {/* Main FAQ Card */}
                  <div className="relative rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1">
                    <AccordionTrigger className="tk-ccmeanwhile w-full px-3 py-2 text-left text-sm text-slate-800 hover:no-underline sm:px-4 sm:py-3 sm:text-base md:px-6 md:py-4 md:text-lg lg:px-8 lg:py-5 [&[data-state=open]>svg]:rotate-180">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="tk-ccmeanwhile px-3 pt-1 pb-2 text-xs leading-relaxed text-slate-700 sm:px-4 sm:pt-2 sm:pb-3 sm:text-sm md:px-6 md:pb-4 md:text-base lg:px-8 lg:pb-6">
                      {faq.links ? (
                        <>
                          {faq.answer
                            .split("Hacker's Guide")
                            .map((part, index, array) => (
                              <span key={index}>
                                {part}
                                {index < array.length - 1 && (
                                  <Link
                                    href={faq.links?.[0]?.href ?? "#"}
                                    className="text-blue-600 hover:underline"
                                  >
                                    Hacker's Guide
                                  </Link>
                                )}
                              </span>
                            ))}{" "}
                          <Link
                            href={faq.links[1]?.href ?? "#"}
                            className="text-blue-600 hover:underline"
                          >
                            Discord
                          </Link>
                          .
                        </>
                      ) : (
                        faq.answer
                      )}
                    </AccordionContent>
                  </div>

                  {/* Black drop shadow */}
                  <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Desktop: Two columns */}
          <div className="hidden min-h-[1000px] grid-cols-2 gap-8 py-6 lg:grid xl:gap-10">
            {/* Column 1 */}
            <div className="space-y-3 sm:space-y-4">
              <Accordion
                type="single"
                collapsible
                className="w-full space-y-3 sm:space-y-4"
              >
                {faqData.slice(0, 8).map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="group relative overflow-hidden rounded-none border-0"
                  >
                    {/* Main FAQ Card */}
                    <div className="relative rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1">
                      <AccordionTrigger className="tk-ccmeanwhile w-full px-3 py-2 text-left text-sm text-slate-800 hover:no-underline sm:px-4 sm:py-3 sm:text-base md:px-6 md:py-4 md:text-lg lg:px-8 lg:py-5 [&[data-state=open]>svg]:rotate-180">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="tk-ccmeanwhile px-3 pt-1 pb-2 text-xs leading-relaxed text-slate-700 sm:px-4 sm:pt-2 sm:pb-3 sm:text-sm md:px-6 md:pb-4 md:text-base lg:px-8 lg:pb-6">
                        {faq.links ? (
                          <>
                            {faq.answer
                              .split("Hacker's Guide")
                              .map((part, index, array) => (
                                <span key={index}>
                                  {part}
                                  {index < array.length - 1 && (
                                    <Link
                                      href={faq.links?.[0]?.href ?? "#"}
                                      className="text-blue-600 hover:underline"
                                    >
                                      Hacker's Guide
                                    </Link>
                                  )}
                                </span>
                              ))}{" "}
                            <Link
                              href={faq.links[1]?.href ?? "#"}
                              className="text-blue-600 hover:underline"
                            >
                              Discord
                            </Link>
                            .
                          </>
                        ) : (
                          faq.answer
                        )}
                      </AccordionContent>
                    </div>

                    {/* Black drop shadow */}
                    <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Column 2 */}
            <div className="space-y-3 sm:space-y-4">
              <Accordion
                type="single"
                collapsible
                className="w-full space-y-3 sm:space-y-4"
              >
                {faqData.slice(8).map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="group relative overflow-hidden rounded-none border-0"
                  >
                    {/* Main FAQ Card */}
                    <div className="relative rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1">
                      <AccordionTrigger className="tk-ccmeanwhile w-full px-3 py-2 text-left text-sm text-slate-800 hover:no-underline sm:px-4 sm:py-3 sm:text-base md:px-6 md:py-4 md:text-lg lg:px-8 lg:py-5 [&[data-state=open]>svg]:rotate-180">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="tk-ccmeanwhile px-3 pt-1 pb-2 text-xs leading-relaxed text-slate-700 sm:px-4 sm:pt-2 sm:pb-3 sm:text-sm md:px-6 md:pb-4 md:text-base lg:px-8 lg:pb-6">
                        {faq.answer}
                      </AccordionContent>
                    </div>

                    {/* Black drop shadow */}
                    <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
