import { useState } from 'react'
import { FaGithubSquare, FaLinkedin, FaRegFilePdf } from "react-icons/fa"
import { IoDocumentTextOutline } from "react-icons/io5"
import { FaRegIdCard } from "react-icons/fa"
import styles from './ethanzeng.module.css'

const resume = '/resume.pdf'

export default function EthanZengPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const introContent = {
    title: "Ethan Zeng",
    body: (
      <>
        <p>
          Hi, This is my application for the KnightHacks dev team.
          I know it's simple, but I if I'm being completely honest I was pressed for time between school and finishing my portfolio.
        </p>
        <p>
          With that said, I’m interested in the position because I want to be more involved with the club and the people in it.
          I also want to improve my skills and I see this as a great environment to do so.
          In general the people and environment at KnightHacks seem really welcoming and fun, and I would love to be a part of it.
        </p>
      </>
    )
  }

  return (
    <main className={styles.introPage}>
      
      <div className={styles.icon} onClick={() => setIsModalOpen(true)}>
        <IoDocumentTextOutline size={80} color="#ffffff"/>
        <p>Intro</p>
      </div>

      <div className={styles.icon}>
        <a href="https://github.com/eethie" target="_blank" rel="noopener noreferrer">
          <FaGithubSquare size={80} color="#000000"/>
          <p>GitHub</p>
        </a>
      </div>

      <div className={styles.icon}>
        <a href="https://linkedin.com/in/ethanzzeng" target="_blank" rel="noopener noreferrer">
          <FaLinkedin size={80} color="#0077b5"/>
          <p>LinkedIn</p>
        </a>
      </div>

      <div className={styles.icon}>
        <a href={resume} target="_blank" rel="noopener noreferrer">
          <FaRegFilePdf size={80} color="#ffffff"/>
          <p>Resume</p>
        </a>
      </div>

      <div className={styles.icon}>
        <a href="https://ethanzeng.dev" target="_blank" rel="noopener noreferrer">
          <FaRegIdCard size={80} color="#E31C2D"/>
          <p>Portfolio</p>
        </a>
      </div>

      {isModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>✕</button>
            <h2>{introContent.title}</h2>
            {introContent.body}
          </div>
        </div>
      )}

    </main>
  )
}