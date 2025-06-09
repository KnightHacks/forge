const aboutWords = 
    "Gemiknights is a 12-hour hackathon focused on building with AI. Participants will get access to Google's Gemini to help bring their ideas to life, whether that means coding tools, training models, or experimenting with new ways to create. It's fast and focused, and it's all about turning bold ideas into working projects, no matter your experience level.";


const About = () => {
  return (
    <div id="about" className="py-16 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-center mb-10 tk-forma-djr-display">
            About Gemiknights
        </span>
        <span className="text-2xl font-semibold text-center mt-4 max-w-5xl px-4 tk-peridot-devanagari">
            {aboutWords}
        </span>
    </div>
  );
}
export default About;