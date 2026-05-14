import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@forge/ui/accordion";

const faqs = [
  {
    question: "WHAT IS A HACKATHON?",
    answer: "",
  },
  {
    question: "WHEN DO HACKER APPLICATIONS OPEN?",
    answer: "",
  },
  {
    question: "WHAT IS A HACKATHON? (2)",
    answer: "",
  },
  {
    question: "WHAT IS A HACKATHON? (3)",
    answer: "",
  },
  {
    question: "HOW MUCH EXPERIENCE DO I NEED?",
    answer: "",
  },
  {
    question: "WHAT IS A HACKATHON? (4)",
    answer: "",
  },
];

const FAQ = () => {
  return (
    <section>
      {/* Header row: title left, tagline right */}
      <div>
        <h2>FAQ</h2>
        <p>GOT QUESTIONS?</p>
      </div>

      {/* Yellow divider */}
      <hr />

      {/* Accordion list */}
      <Accordion type="single" collapsible>
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default FAQ;
