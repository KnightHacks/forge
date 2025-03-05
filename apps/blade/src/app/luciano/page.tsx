import Footer from "./_components/footer";
import Header from "./_components/header";

export default function Page() {
    return (
      <div className="min-h-screen flex flex-col items-center px-6">
        <Header />
        
        <section id="hero" className="text-center py-20">
          <h1 className="w-full break-words text-center text-3xl font-extrabold leading-tight tracking-tight sm:text-[3rem]">Hello, I'm Luciano</h1>
          <p className="mt-4">I specialize in backend development and software development.</p>
        </section>
  
        <section id="about" className="max-w-3xl text-center py-16">
        <h3 className="text-3xl font-semibold">About Me</h3>
        <div className="flex justify-center gap-6 mt-6">
          {[
            { name: "GitHub", url: "https://github.com/luciano093", icon: "/github.svg", bgLight: "bg-gray-200", bgDark: "bg-gray-800" },
            { name: "LinkedIn", url: "https://www.linkedin.com/in/luciano-paredes-701300191", icon: "/linkedIn.svg" },
            { name: "Resume", url: "https://docs.google.com/document/d/1nV0t8hb_i7J-0bFtAZKs0wBgVgPiJXbP/edit?usp=sharing&ouid=112302935885971708835&rtpof=true&sd=true", icon: "/resume.png" },
          ].map((social) => (
            <a 
              key={social.name} 
              href={social.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="dark:bg-gray-600 bg-gray-100 p-4 rounded-lg shadow-lg transform transition-transform hover:scale-110"
            >
              <img src={social.icon} alt={social.name} className="w-12 h-12" />
            </a>
          ))}
        </div>
      </section>

        <Footer />
      </div>
    );
  }
  