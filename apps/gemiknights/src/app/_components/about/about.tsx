const aboutWords = 
    "Gemiknights is a 12-hour hackathon focused on building with AI. Participants will get access to Google's Gemini to help bring their ideas to life, whether that means coding tools, training models, or experimenting with new ways to create. It's fast and focused, and it's all about turning bold ideas into working projects, no matter your experience level.";


const About = () => {
  return (
    <div id="about" className="py-8 sm:py-12 md:py-16 flex flex-col items-center justify-center">
        <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-6 sm:mb-8 md:mb-10 tk-forma-djr-display">
            About Gemiknights
        </span>
        <span className="text-lg sm:text-xl md:text-2xl font-semibold text-center mt-2 sm:mt-3 md:mt-4 max-w-[90%] sm:max-w-[80%] md:max-w-5xl px-4 sm:px-6 md:px-8 tk-peridot-devanagari">
            {aboutWords}
        </span>
    </div>
  );
}
export default About;