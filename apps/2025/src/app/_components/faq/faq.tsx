"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import useStaggeredAnimation from "~/hooks/useStaggeredAnimation";

/* Radix aliases ----------------------------------------------------------- */
const Accordion = AccordionPrimitive.Root;
const AccordionItem = AccordionPrimitive.Item;
const AccordionTrigger = AccordionPrimitive.Trigger;
const AccordionContent = AccordionPrimitive.Content;

/* ------------------------------------------------------------------------ */

interface FaqLink {
  text: string;
  href: string;
}
interface FaqItem {
  id: string;
  question: string;
  answer: string;
  links?: FaqLink[];
  category:
    | "general"
    | "event-details"
    | "preparation"
    | "logistics"
    | "sponsor-volunteer";
}

/* FILTER CATEGORIES ------------------------------------------------------- */
const FILTER_CATEGORIES = [
  {
    id: "general" as const,
    label: "General",
    bgColor: "bg-[#FBB03B]",
  },
  {
    id: "event-details" as const,
    label: "Event Details",
    bgColor: "bg-[#d83434]",
  },
  {
    id: "preparation" as const,
    label: "Preparation",
    bgColor: "bg-[#1570AD]",
  },
  {
    id: "logistics" as const,
    label: "Logistics",
    bgColor: "bg-[#3C0061]",
  },
  {
    id: "sponsor-volunteer" as const,
    label: "Sponsorship & Volunteering",
    bgColor: "bg-[#28a745]",
  },
] as const;

/* FAQ DATA ---------------------------------------------------------------- */
const faqData: FaqItem[] = [
  {
    id: "1",
    question: "What is a Hackathon?",
    answer:
      "A hackathon is a weekend-long event where students come together to learn the latest technologies and build innovative projects. These projects can range from involving web or mobile development to building a hardware project, or anything in between. Hackathons are a great way to learn new skills, meet new people, and have fun! Additionally, throughout the weekend we will be hosting workshops, fun social events, networking opportunities with sponsors, free food & swag, and so much more.",
    category: "general",
  },
  {
    id: "2",
    question: "How long is Knight Hacks?",
    answer:
      "Knight Hacks is a 36‑hour hackathon, beginning in the late afternoon on Friday 10/24 and ending at the late afternoon on Sunday 10/26. We encourage you to work on your project for as long as you can during this time!",
    category: "event-details",
  },
  {
    id: "3",
    question: "Who can attend?",
    answer:
      "If you're currently a college student or have graduated in the past year, you're more than welcome to attend! Even beginners are able to attend.",
    category: "general",
  },
  {
    id: "4",
    question: "How much experience do I need?",
    answer:
      "None! We welcome students from all academic backgrounds and skill levels, so don't be afraid to come and join us! We'll have introductory workshops for you to learn new skills, industry mentors to help you out, and great tools to build your projects. Whether you've never coded before or have lots of experience, there's a place for you at Knight Hacks!",
    category: "general",
  },
  {
    id: "5",
    question: "Do I need a team?",
    answer:
      "Not at all! You can be a lone wolf, come with a team (no more than four people), or join some teams at Knight Hacks. We'll also have team‑building activities to help you find the right teammates!",
    category: "preparation",
  },
  {
    id: "6",
    question: "How much does it cost?",
    answer:
      "Nothing! That's right, Knight Hacks is entirely free for all attendees to participate. All you need to worry about is learning new skills, developing cool projects, and having fun!",
    category: "general",
  },
  {
    id: "7",
    question: "What can I build?",
    answer:
      "Anything your heart desires! Whatever you're interested in, we will support it. We have five tracks that will have extra resources, sponsored challenges, and other events to inspire you and prepare you. Check out our previous Devpost for examples of what participants built in the past!",
    category: "event-details",
  },
  {
    id: "8",
    question: "My question wasn't answered, where can I ask?",
    answer:
      "Here's the link to the Hacker's Guide. If a question wasn't answered feel free to ask in the ",
    links: [
      {
        text: "Hackers Guide",
        href: "https://knight-hacks.notion.site/knight-hacks-viii",
      },
      { text: "Discord", href: "https://discord.knighthacks.org/" },
    ],
    category: "logistics",
  },
  {
    id: "9",
    question: "Where can I sleep?",
    answer:
      "We provide designated quiet rooms for attendees to rest during the event. Feel free to bring a sleeping bag, blanket, or anything that helps you feel comfortable. Just make sure to take care of yourself and get rest when you need it!",
    category: "logistics",
  },
  {
    id: "10",
    question: "What should I bring?",
    answer:
      "Bring your laptop, charger, any hardware you want to use, a reusable water bottle, and toiletries if you're staying overnight. Also consider bringing comfy clothes, a blanket, and whatever else keeps you cozy. We'll handle food and snacks!",
    category: "preparation",
  },
  {
    id: "11",
    question: "Is food provided?",
    answer:
      "We provide free meals, snacks, and drinks throughout the event to keep you energized. We also accommodate dietary restrictions—just let us know during registration.",
    category: "logistics",
  },
  {
    id: "12",
    question: "Do I have to stay the whole time?",
    answer:
      "Nope! While we encourage you to stay for as much of the event as you can (so you don't miss out on the fun), you're free to come and go as needed.",
    category: "logistics",
  },
  {
    id: "13",
    question: "What if I've never been to a hackathon before?",
    answer:
      "That's totally fine; Knight Hacks is beginner‑friendly! We have workshops, mentors, and a welcoming environment to help you get started and learn as you go.",
    category: "general",
  },
  {
    id: "14",
    question: "Can I use a past project or something I've built before?",
    answer:
      "Nope—projects must be started after the hackathon begins. You're welcome to brainstorm ideas or learn tools ahead of time, but actual work should begin during the event to keep it fair for everyone.",
    category: "event-details",
  },
  {
    id: "15",
    question: "Is Knight Hacks in person or virtual?",
    answer:
      "Knight Hacks is fully in‑person! Everything from check‑in to project submission to demos will happen at the venue. Make sure you're able to attend in person before registering.",
    category: "general",
  },
  {
    id: "16",
    question: "How can I become a sponsor?",
    answer:
      "We'd love to have your organization as a sponsor! Sponsoring Knight Hacks gives you the opportunity to connect with talented students, showcase your brand, and support the tech community. If you'd like to learn more about sponsorship opportunities, please visit this link: ",
    links: [
      {
        text: "https://blade.knighthacks.org/sponsor",
        href: "https://blade.knighthacks.org/sponsor",
      },
    ],
    category: "sponsor-volunteer",
  },
  {
    id: "17",
    question: "Can I volunteer at Knight Hacks?",
    answer:
      "Absolutely! We're always looking for enthusiastic volunteers to help make Knight Hacks a success. Volunteers help with registration, logistics, mentoring, and various event activities. It's a great way to be part of the hackathon community and gain experience. If you're interested in volunteering, please reach out to us at hack@knighthacks.org!",
    category: "sponsor-volunteer",
  },
  {
    id: "18",
    question: "What are the benefits of sponsoring Knight Hacks?",
    answer:
      "Sponsors get brand visibility, direct access to talented students for recruiting, opportunities to host workshops or challenges, and the chance to be part of Central Florida's largest hackathon. Different sponsorship tiers offer various benefits including booth space, branded swag distribution, and speaking opportunities.",
    category: "sponsor-volunteer",
  },
  {
    id: "19",
    question: "Do volunteers get any perks?",
    answer:
      "Yes! Volunteers receive exclusive Knight Hacks swag, meals during their shifts, and the satisfaction of helping create an amazing experience for all participants. Plus, it's a great way to network and learn about event organization.",
    category: "sponsor-volunteer",
  },
  {
    id: "20",
    question: "How do I find teammates?",
    answer:
      "Join our Discord community where you can connect with other participants! We'll create a dedicated channel for team formation closer to the hackathon date. It's a great place to meet people, share your skills, and find others with complementary abilities. We'll also have team-finding activities at the event itself to help you connect with potential teammates in person.",
    links: [
      {
        text: "Discord",
        href: "https://discord.knighthacks.org/",
      },
    ],
    category: "preparation",
  },
  {
    id: "21",
    question: "What should I expect as a first-time hackathon participant?",
    answer:
      "Get ready for an incredible weekend! You'll have a ton of fun building something amazing, meet lots of awesome people and sponsors, and see some truly impressive projects from other participants. Yes, you might lose a bit of sleep (but not too much - we encourage rest!), but the energy and excitement make it totally worth it. The atmosphere is collaborative and welcoming, so don't hesitate to ask questions or help others.",
    category: "preparation",
  },
  {
    id: "22",
    question: "Should I come with a project idea already planned?",
    answer:
      "It's totally up to you! Some people like to brainstorm ideas beforehand, while others prefer to get inspired by the workshops, challenges, and conversations during the event. Both approaches work great. If you do come with ideas, keep them flexible - you might discover something even more exciting once you're there and see what's possible.",
    category: "preparation",
  },
  {
    id: "23",
    question: "What if I don't have a laptop or it's not powerful enough?",
    answer:
      "Don't let that stop you from participating! Reach out to us at hack@knighthacks.org and we'll do our best to help you find a solution. You can also team up with others who have the hardware you need - many successful projects are built collaboratively with team members contributing different resources and skills.",
    category: "preparation",
  },
  {
    id: "24",
    question: "How does project submission and judging work?",
    answer:
      "We use Devpost for project submissions, and judging follows a science fair style format where you'll demo your project to judges who visit your table. For more detailed information and deeper explanations of the submission process, check out the ",
    links: [
      {
        text: "Hacker's Guide",
        href: "https://knight-hacks.notion.site/knight-hacks-viii",
      },
    ],
    category: "event-details",
  },
  {
    id: "25",
    question: "Are there showers available?",
    answer:
      "Yes! Showers are available at the UCF Recreation and Wellness Center. We'll provide participants with free entry details and more information in the ",
    links: [
      {
        text: "Hacker's Guide",
        href: "https://knight-hacks.notion.site/knight-hacks-viii",
      },
    ],
    category: "logistics",
  },
  {
    id: "26",
    question: "Is there parking available at the venue?",
    answer:
      "Yes! We'll provide free parking passes for specific garages over the weekend. Details about which garages and how to get your parking pass will be available in the ",
    links: [
      {
        text: "Hacker's Guide",
        href: "https://knight-hacks.notion.site/knight-hacks-viii",
      },
    ],
    category: "logistics",
  },
  {
    id: "27",
    question: "When is the deadline to become a sponsor?",
    answer:
      "We encourage organizations to reach out as early as possible to secure their preferred sponsorship tier and benefits. However, we do accept new sponsors up until close to the event date. Contact us soon to ensure you don't miss out on the opportunity to be part of Central Florida's largest hackathon!",
    category: "sponsor-volunteer",
  },
];

/* ------------------------------------------------------------------------ */

interface FilterButtonProps {
  category: (typeof FILTER_CATEGORIES)[number];
  isActive: boolean;
  onClick: () => void;
}

function FilterButton({ category, isActive, onClick }: FilterButtonProps) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={`tk-ccmeanwhile relative block rounded-none px-3 py-2 text-center text-sm font-bold text-white outline-2 -outline-offset-3 outline-black transition-all duration-200 ease-in-out group-hover:-translate-x-1 group-hover:-translate-y-1 hover:brightness-110 focus:outline-4 focus:outline-offset-2 focus:outline-[#d83434] focus:brightness-110 md:text-base ${category.bgColor} ${
          isActive ? "-translate-x-1 -translate-y-1 brightness-110" : ""
        }`}
      >
        {category.label}
      </button>
      <div
        className={`absolute inset-0 -z-10 h-full w-full bg-black transition-all duration-200 ease-in-out ${
          isActive
            ? "translate-x-2 translate-y-2"
            : "group-hover:translate-x-2 group-hover:translate-y-2"
        }`}
      />
    </div>
  );
}

export default function Faq() {
  const faqRef = useStaggeredAnimation(50);
  const [activeFilter, setActiveFilter] =
    useState<(typeof FILTER_CATEGORIES)[number]["id"]>("general");

  const filteredFaqData = faqData.filter(
    (faq) => faq.category === activeFilter,
  );

  return (
    <div className="flex w-full justify-center">
      <section
        id="faqs"
        ref={faqRef}
        className="relative isolate z-10 mt-0 flex w-[90%] flex-col items-center pt-0 pb-16 sm:mt-40 sm:pt-0 sm:pb-20 md:pb-32 lg:pb-36 xl:pb-40"
      >
        <div className="relative z-10 mb-6 flex w-full items-center justify-center md:mb-10 lg:mb-12">
          <div className="stagger-item animate-pop-out relative flex w-full items-center justify-center sm:w-[95%] md:w-[75%] lg:w-[70%] xl:w-[65%]">
            <Image
              src="/sponsorSectionSvgs/spikeything.svg"
              alt=""
              width={0}
              height={0}
              sizes="100vw"
              className="z-10 h-[80%] w-[80%] md:h-[60%] md:w-[60%]"
            />
            <h2
              className="absolute top-1/2 left-1/2 z-20 mt-[1%] -translate-x-1/2 -translate-y-1/2 transform text-[6vw] text-[#d83434] sm:text-[5vw] md:text-[4vw] lg:text-[3vw] xl:text-[3.3vw]"
              style={{ fontFamily: '"The Last Shuriken"' }}
            >
              FAQ'S
            </h2>
          </div>
        </div>

        <div
          className="stagger-item mb-8 flex flex-wrap items-center justify-center gap-3 md:gap-4"
          style={{ animationDelay: "0.5s" }}
        >
          {FILTER_CATEGORIES.map((category) => (
            <div key={category.id} className="animate-pop-out2">
              <FilterButton
                category={category}
                isActive={activeFilter === category.id}
                onClick={() => setActiveFilter(category.id)}
              />
            </div>
          ))}
        </div>

        {/* FAQ Content */}
        <div className="w-full px-4 py-4 sm:px-2">
          <div className="mx-auto max-w-4xl">
            {/* Fixed height container to prevent background shifting */}
            <div className="min-h-[1000px] sm:min-h-[1100px] md:min-h-[1200px] lg:min-h-[1300px]">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {filteredFaqData.map((faq) => (
                  <div key={faq.id} className="stagger-item animate-pop-out">
                    <FaqCard {...faq} />
                  </div>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* reusable card ----------------------------------------------------------- */
function FaqCard({ id, question, answer, links }: FaqItem) {
  return (
    <AccordionItem
      value={id}
      className="group relative overflow-hidden rounded-none border-0"
    >
      {/* front face */}
      <div className="relative rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-all duration-200 ease-in-out group-hover:-translate-x-1 group-hover:-translate-y-1">
        <AccordionTrigger className="tk-ccmeanwhile flex w-full items-center justify-between px-4 py-4 text-left text-base text-slate-800 transition-all duration-300 ease-in-out hover:no-underline sm:px-4 sm:py-3 sm:text-base md:px-6 md:py-4 md:text-lg lg:px-8 lg:py-5 [&[data-state=open]>svg]:rotate-180">
          <span className="flex-1 pr-3 leading-normal">{question}</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-600 transition-transform duration-300 ease-in-out" />
        </AccordionTrigger>

        <AccordionContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm transition-all duration-300 ease-in-out">
          <div className="tk-ccmeanwhile px-4 pt-2 pb-4 text-sm leading-relaxed text-slate-700 sm:px-4 sm:pt-2 sm:pb-3 sm:text-sm md:px-6 md:pb-4 md:text-base lg:px-8 lg:pb-6">
            {links ? (
              <>
                {/* Handle the special Hacker's Guide + Discord case */}
                {links.length === 2 && links[0]?.text === "Hackers Guide" ? (
                  <>
                    {answer.split("Hacker's Guide").map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <Link
                            href={links[0]?.href ?? "#"}
                            className="text-blue-600 transition-colors duration-200 hover:underline"
                          >
                            Hacker's Guide
                          </Link>
                        )}
                      </span>
                    ))}{" "}
                    <Link
                      href={links[1]?.href ?? "#"}
                      className="text-blue-600 transition-colors duration-200 hover:underline"
                    >
                      Discord
                    </Link>
                    .
                  </>
                ) : links.length === 1 && links[0]?.text === "Discord" ? (
                  /* Handle single Discord link embedded in text */
                  <>
                    {answer.split("Discord").map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <Link
                            href={links[0]?.href ?? "#"}
                            className="text-blue-600 transition-colors duration-200 hover:underline"
                          >
                            Discord
                          </Link>
                        )}
                      </span>
                    ))}
                  </>
                ) : (
                  /* Handle general single or multiple links */
                  <>
                    {answer}
                    {links.map((link, index) => (
                      <span key={index}>
                        <Link
                          href={link.href}
                          className="text-blue-600 transition-colors duration-200 hover:underline"
                        >
                          {link.text}
                        </Link>
                        {index < links.length - 1 ? ", " : "."}
                      </span>
                    ))}
                  </>
                )}
              </>
            ) : (
              answer
            )}
          </div>
        </AccordionContent>
      </div>

      {/* shadow */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-black transition-all duration-200 ease-in-out group-hover:translate-x-2 group-hover:translate-y-2" />
    </AccordionItem>
  );
}
