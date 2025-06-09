import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import { faqItems } from "./faq-data";

const FAQ = () => {
  return (
    <div id="faqs" className="flex flex-col items-center justify-center w-full ">
        <span className="tk-forma-djr-display text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 md:mb-10">
            FAQ
        </span>    
        <Accordion type="single" collapsible className="w-3/5">
        {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index + 1}`} className="border-b">
            <AccordionTrigger className="w-full text-left py-2 sm:py-3 md:py-4 px-4 sm:px-5 md:px-6 text-base sm:text-lg md:text-xl font-semibold 
                                        transition-all duration-500 hover:bg-white/5 hover:scale-[1.02] rounded-lg">
                {item.question}
            </AccordionTrigger>
            <AccordionContent 
                className="tk-peridot-devanagari p-4 sm:p-5 md:p-6 text-sm sm:text-base md:text-lg overflow-hidden
                        data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
            >
                {item.answer}
            </AccordionContent>
            </AccordionItem>
        ))}
        </Accordion>
    </div>
  );
} 
export default FAQ;