import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="p-5 font-sans bg-gray-100 border-b border-gray-300">
      <nav>
        <ul className="list-none flex gap-5 m-0 p-0">
          <li>
            <a href="https://www.linkedin.com/in/your-linkedin-profile" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </li>
          <li>
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer">
              Resume
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;