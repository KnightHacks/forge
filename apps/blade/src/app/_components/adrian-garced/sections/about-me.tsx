"use client"

import { useState, useEffect } from "react";

type Book = {
  author: string;
  title: string;
  coverId: string;
}

export default function AboutMe() {
  const [book, setBook] = useState<Book>();

  // 1. READ: Fetch items from the API
  const fetchBook = async () => {
    const res = await fetch('https://openlibrary.org/search.json?q=inside+the+machine&fields=title,author_name,cover_i');
    const data = await res.json();
    setBook(data.docs[0]);
  };

  useEffect(() => {
    fetchBook();
  }, []);

  return (
    <section id="about-me" className="mt-10">
      <p className="text-sm font-medium tracking-wider text-emerald-400">
        pinkytoefoo@~: whoami
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        About Me
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-100">
        I'm interested in fullstack web development, game development,
        systems programming, and graphics. Most of my learning comes
        from building experimental projects. I am working on trying to
        finish my projects and make them resume ready.
      </p>
    </section>
  );
}