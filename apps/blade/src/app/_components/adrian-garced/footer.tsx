export default function Footer() {
  return (
    <footer
      id="contact"
      className="border-t border-neutral-800 bg-[#0a0a0a]"
    >
      <div className="border-t border-neutral-900">
        <div className="text-sm mx-auto max-w-6xl px-6 py-6 flex flex-col gap-2 text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Adrian</p>
          <p>Built with Next.js, Tailwind, and Motion.</p>
        </div>
      </div>
    </footer>
  );
}
