import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../../../../packages/ui/src/accordion";
import FaqSVG from "./faq-svg";
import Link from "next/link";

export default function Faq() {
  return (
    <div className="z-10000 flex w-full justify-center px-4">
      <div className="relative w-[99%] md:w-[60%]">
        <FaqSVG className="z-1000 mb-5 h-40 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Column 1 */}
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem
                value="item-1"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  What is A Hackathon?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  A hackathon is a weekend-long event where students come
                  together to learn the latest technologies and build innovative
                  projects. These projects can range from involving web or
                  mobile development to building a hardware project, or anything
                  in between. Hackathons are a great way to learn new skills,
                  meet new people, and have fun! Additionally, throughout the
                  weekend we will be hosting workshops, fun social events,
                  networking opportunities with sponsors, free food & swag, and
                  so much more.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  How long is Knight Hacks?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  Knight hacks is a 36-hour hackathon, beginning at 5pm on
                  Friday (check-in runs from 5-8pm, with the opening ceremony
                  starting at 8pm) and ending at 6pm on Sunday. We encourage you
                  to work on your project for as long as you can during this
                  time.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  Who can Attend?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  If you're currently a college student or have graduated in the
                  past year, you're more than welcome to attend! Even beginners
                  are able to attend.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  How much experience do I need?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  None! We welcome students from all academic backgrounds and
                  skill levels, so don't be afraid to come and join us! We'll
                  have introductory workshops for you to learn new skills,
                  industry mentors to help you out, and great tools to build
                  your projects. Whether you've never coded before or have lots
                  of experience, there's a place for you at Knight Hacks!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-5"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  Do I need a team?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  Not at all! You can be a lone wolf, come with a team (no more
                  than four people), or join some teams at Knight Hacks. We'll
                  also have team building activities to help you find the right
                  teammates!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-6"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  How much does it cost?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  Nothing! That's right, Knight Hacks is entirely free for all
                  attendees to participate. All you need to worry about is
                  learning new skills, developing cool projects, and having fun!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-7"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  What can I build?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  Anything your heart desires! Whatever you're interested in we
                  will support it. We have five tracks that will have extra
                  resources, sponsored challenges, and other events to inspire
                  you and prepare you. Check out our previous devpost for
                  examples of what participants built in the past!!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-8"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  My question wasn't answered, where can I ask?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  Here's the link to the{" "}
                  <Link href="#" className="text-blue-600 hover:underline">
                    hackers guide
                  </Link>
                  . If a question wasn't answered feel free to ask in the{" "}
                  <Link href="#" className="text-blue-600 hover:underline">
                    Discord
                  </Link>
                  .
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem
                value="item-9"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  Where can I sleep?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  We provide designated quiet rooms for attendees to rest during
                  the event. Feel free to bring a sleeping bag, blanket, or
                  anything that helps you feel comfortable. Just make sure to
                  take care of yourself and get rest when you need it!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-10"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  What should I bring?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  Bring your laptop, charger, any hardware you want to use, a
                  reusable water bottle, and toiletries if you're staying
                  overnight. Also consider bringing comfy clothes, a blanket,
                  and whatever else keeps you cozy. We'll handle food and
                  snacks!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-11"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  Is food provided?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  We provide free meals, snacks, and drinks throughout the event
                  to keep you energized. We also accommodate dietary
                  restrictions—just let us know during registration.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-12"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  Do I have to stay the whole time?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  Nope! While we encourage you to stay for as much of the event
                  as you can (so you don't miss out on the fun), you're free to
                  come and go as needed.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-13"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  What if I've never been to a hackathon before?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  That's totally fine; Knight Hacks is beginner-friendly! We
                  have workshops, mentors, and a welcoming environment to help
                  you get started and learn as you go.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-14"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  Can I use a past project or something I've built before?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  Nope—projects must be started after the hackathon begins.
                  You're welcome to brainstorm ideas or learn tools ahead of
                  time, but actual work should begin during the event to keep it
                  fair for everyone.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-15"
                className="overflow-hidden rounded-lg border-0 bg-[#F7F0C6]"
              >
                <AccordionTrigger className="w-full px-6 py-4 text-left text-slate-800 transition-colors hover:bg-amber-200 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  Is Knight Hacks in person or virtual?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-slate-700">
                  Knight Hacks is fully in-person! Everything from check-in to
                  project submission to demos will happen at the venue. Make
                  sure you're able to attend in-person before registering.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
        <div className="h-screen w-full"></div>
      </div>
    </div>
  );
}
