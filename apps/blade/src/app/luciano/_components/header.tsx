export default function Header() {
    return <header className="w-full max-w-4xl flex justify-between items-center py-6">
    <h1 className="text-3xl font-bold">Dev Team Application</h1>
    <nav>
      <ul className="flex gap-6">
        <li><a href="/luciano" className="hover:text-gray-400">About</a></li>
        <li><a href="/luciano/projects" className="hover:text-gray-400">Projects</a></li>
      </ul>
    </nav>
  </header>
}