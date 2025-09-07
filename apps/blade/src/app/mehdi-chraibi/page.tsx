export default function MehdiChraibiPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900 p-6">
      <h1 className="text-4xl font-bold mb-4">Hey, I'm Mehdi Chraibi!</h1>
      <p className="text-lg text-gray-700 mb-8 text-center">
        I'm a 3rd year UCF student interested in software development.
      </p>

      <div className="flex gap-4">
        <a
          href="https://github.com/your-github"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 rounded-2xl bg-gray-900 text-white hover:bg-gray-700 transition"
        >
          GitHub
        </a>
        <a
          href="https://linkedin.com/in/your-linkedin"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 transition"
        >
          LinkedIn
        </a>
        <a
          href="/resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 rounded-2xl bg-green-600 text-white hover:bg-green-500 transition"
        >
          Resume
        </a>
      </div>
    </main>
  );
}