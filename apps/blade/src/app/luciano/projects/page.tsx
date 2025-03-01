import Footer from "../_components/footer";
import Header from "../_components/header";

const projects = [
  {
    id: 1,
    name: "Toy Language",
    description: "Small interpreted C-like language with modern syntax written in pure javascript.",
    image: "/language.png",
    url: "https://github.com/luciano093/interpreter",
  },
  {
    id: 2,
    name: "Matrix server",
    description: "An implementation of the Matrix specification to create an open network for secure, decentralised communication.",
    image: "/matrix.png",
    url: "https://github.com/luciano093/matrix-oxide",
  },
  {
    id: 3,
    name: "ItenerAIry",
    description: "An AI assisted trip planner that creates an itinerary based on user information and a given destination.",
    image: "/itinerary.png",
    url: "https://github.com/luciano093/knighthacks2024",
  },
]

export default function Page() {
    return (
      <div className="min-h-screen flex flex-col items-center px-6">
        <Header />
        
        <section id="hero" className="text-center py-20">
          <h1 className="w-full break-words text-center text-3xl font-extrabold leading-tight tracking-tight sm:text-[3rem]">Projects</h1>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-white">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="bg-gray-700 max-w-lg p-6 rounded-lg shadow-lg flex flex-col items-center transition-transform transform hover:scale-105 min-h-[400px]"
            >
              <img 
                src={project.image} 
                alt={`Project ${project.id}`} 
                className="w-64 h-40 object-cover rounded-lg transition-transform transform hover:scale-110"
              />
              <h4 className="text-xl font-bold mt-4">{project.name}</h4>
              <p className="text-gray-300 mt-2 flex-grow">{project.description}</p>
              <a 
                href={project.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white p-2 rounded-sm shadow-lg cursor-pointer"
              >
                <img src="/github.svg" className="w-10 h-10" alt="GitHub" />
              </a>
            </div>
          ))}
        </div>
        <Footer />
      </div>
    );
}
