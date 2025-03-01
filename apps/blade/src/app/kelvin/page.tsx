"use client";

import { useState } from "react";
import {  AiFillLinkedin} from "react-icons/ai";
import Image from "next/image";
import { FaGithub } from "react-icons/fa";
import HelloBot from "./images/HelloBot.gif"
import image1 from "./images/Workout.png" 
import image2 from "./images/Latin-Learner.png"

export default function Home() {
    const [isBig, setIsBig] = useState(false);

    return (
    <div>
        <main className=" bg-white px-10 dark:bg-gray-900 md:px-20 lg:px-40">
            <section className="min-h-screen">
                <nav className="py-10 mb-12 flex justify-between  dark:text-white">
                <div className="w-fit overflow-hidden">
                    <h1 
                    className="animate-typing overflow-hidden whitespace-nowrap border-r-4 border-r-white pr-0 text-xl text-black font-bold inline-block dark:text-white"
                    style={{
                    animation: "typing 2s steps(20) forwards, blink 1.1s infinite",
                    willChange: "width",
                    transform: "translateZ(0)",
                        }}
                            >
                            Hello, World!</h1>
                            <style>
                                {`
                                @keyframes typing {
                                    from { width: 0% }
                                    to { width: 100% }
                                }
                                @keyframes blink {
                                    50% { border-color: transparent }
                                    100% { border-color: currentColor }
                                }
                                `}
                            </style>
                    </div>
                    
                    <ul className="flex items-center">
                    <li>
                        <a 
                            href="https://www.linkedin.com/in/kelvin-solorzano" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-1 bg-blue-600 dark:bg-white rounded-lg"
                        >
                            <AiFillLinkedin className="text-white dark:text-blue-600 text-3xl" />
                        </a>
                    </li>
                    <li>
                        <a 
                            href="https://github.com/Kelvinsb52"
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center justify-center p-1"
                        >
                            <FaGithub className="text-4xl text-black dark:text-white" />
                        </a>
                    </li>

                    <li>
                        <a 
                            className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-2 py-2 border-none rounded-md ml-2"
                            href="https://drive.google.com/file/d/1M183Yfn4oseGUi_YSlcyZ1MRm49h1l1D/view?usp=sharing"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Resume
                        </a>
                    </li>
                    </ul>
                </nav>
                <div className="text-center p-10 py-10">
                
                <h2 
                    className="text-5xl py-2 font-medium md:text-6xl transition-all duration-500"
                    style={{
                        color: "#fff", 
                        textShadow: "0 0 10px #03bcf4, 0 0 20px #03bcf4", 
                    }}
                    >
                    I am Kelvin
                </h2>                    
                <p className="text-md py-5 leading-8  max-w-xl mx-auto md:text-xl  dark:text-white">    
                    I am a junior studying Computer Science with a strong passion for AI. I'm particularly 
                    excited about the intersection of AI and web development, as I enjoy building applications 
                    that use AI. My interests lie in developing AI-driven solutions such as computer vision applications 
                    and chatbots that assist both businesses and individuals across various fields.
                    </p>
                    
                    <div className="mx-auto rounded-full w-80 h-80 relative overflow-hidden md:h-96 md:w-96">
                        <Image 
                        src={HelloBot}
                        alt="Animated HelloBot GIF"  
                        layout="fill" 
                        objectFit="cover"
                        />
                    </div>
                    <h3
                        className="text-2xl py-2 md:text-3xl dark:text-white box-reflect"
                        style={{
                        animation: "dimlight 5s infinite",
                        }}
                    >
                        This Is My Mini Portfolio
                    </h3>
                    <style>
                        {`
                        @keyframes dimlight {
                            0%, 18%, 20%, 50.1%, 60%, 65.1%, 80%, 90.1%, 92% {
                            color: #0e3742;
                            box-shadow: none;
                            }
                            18.1%, 20.1%, 30%, 50%, 60.1%, 65%, 80.1%, 90%, 92.1%, 100% {
                            color: #fff;
                            text-shadow: 0 0 10px #03bcf4;
                            }
                        }

                        .box-reflect {
                            -webkit-box-reflect: below 1px linear-gradient(transparent, #0004);
                        }
                        `}
                    </style>    
        </div>
            </section>
            <section>
                <div>
                    <div>
                        <h3 className="text-3xl py-1 ">Technologies and Languages I use</h3>
                        <p className="text-md py-2 leading-8 ">
                            Since my passion lies at the interstion of AI and web development
                            I've mostly worked with languages and technologies that combine the two
                        </p>
                    </div>
                    <div className="lg:flex gap-10">
                        <div className="text-center shadow-lg p-10 rounded-xl my-10 flex-1 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                            <h4 className="py-4 text-teal-600">Languages</h4>
                            <p>Python</p>
                            <p>Java</p>
                            <p>Javascript</p>
                            <p>C</p>
                        </div>
                        <div className="text-center shadow-lg p-10 rounded-xl my-10 flex-1 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                            <h4 className="py-4 text-teal-600">Technologies</h4>
                            <p>Pytorch</p>
                            <p>Tensorflow</p>
                            <p>OpenCV</p>
                            <p>React</p>
                            <p>Node.js</p>
                            <p>Express.js</p>
                        </div>
                        <div className="text-center shadow-lg p-10 rounded-xl my-10 flex-1 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                            <h4 className="py-4 text-teal-600">Interests</h4>
                            <p>Languages</p>
                            <p>Reading</p>
                            <p>History</p>
                            <p>AI</p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-10">
                <div>
                    <h3 className="text-3xl py-1">Portfolio</h3>
                    <h1>These are some projects that I enjoyed most making</h1>
                </div>
                <div className="flex flex-col gap-10 py-10">
                <div className="flex flex-col-reverse lg:flex-row items-center lg:items-start gap-6">
                        <div className="flex-1 flex flex-col justify-center h-full">
                        <a href="https://github.com/Kelvinsb52/Latin-Helper" target="_blank" rel="noopener noreferrer">
                            <h3 className="text-xl font-semibold">Latin Helper</h3>
                        </a>
                        <p className="text-gray-600">
                            A simple web app built using Streamlit, Python, and LangChain. 
                            I am currently learning Latin for fun, and I figured I could build an app to help me with this. 
                            I read that the best way to learn Latin is by reading the works of ancient Latin poets. 
                            This app uses a simple function that parses text from PDF files, allowing an AI bot 
                            to retrieve relevant information when asked. It also gives at the end a relevant Roman proverb
                            and some writing exercises to do.
                        </p>

                        </div>
                        <Image 
                            src={image2}
                            alt="image2"
                            width={500} 
                            height={300} 
                            className="rounded-lg"
                        />
                    </div>
                <div className="flex flex-col-reverse lg:flex-row items-center lg:items-start gap-6">
                    <div className="flex-1 flex flex-col justify-center h-full">
                    <a href="https://github.com/Kelvinsb52/MernProject" target="_blank" rel="noopener noreferrer">
                        <h3 className="text-xl font-semibold">Workout Tracker</h3>
                    </a>
                    <p className="text-gray-600">
                        I created this app as a solution to a real-life problem I was facing. 
                        I wanted to track my workouts, but beyond that, I wanted an assistant to help me. 
                        I've experienced injuries while lifting weights, so I figured having an AI-powered 
                        assistant that could suggest workouts and provide guidance on proper form 
                        would be extremely useful.
                    </p>

                    </div>
                    <Image 
                        src={image1}
                        width={500}
                        alt="image1" 
                        height={300} 
                        className="rounded-lg"
                    />
                    </div>
                    <div className="flex flex-col lg:flex-row items-center gap-6">
                        <div className="flex-1">
                        <a href="https://github.com/Kelvinsb52/Convolutional-NN" target="_blank" rel="noopener noreferrer">
                            <h3 className="text-xl font-semibold">Convolutional Neural Network</h3>
                        </a>
                        <p className="text-gray-600">
                            This project was one of the most satisfying to complete. 
                            I learned how to build a convolutional neural network using only Python and NumPy, 
                            but more importantly, I worked through the underlying math and documented it 
                            as an exercise in LaTeX. This was a huge learning experience for me, as I gained 
                            a deeper understanding of how to break down seemingly complex AI concepts 
                            by coding and working through the mathematics behind them.
                        </p>
                        </div>
                    </div>
                </div>
                <button 
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 text-xl"
                    onClick={() => setIsBig(!isBig)}
                    >
                    Click for a Big <span className={`transition-all duration-500 ${isBig ? "text-6xl" : "text-xl"}`}>Surprise</span>! 😱
                </button>
            </section>
        </main>
    </div>
    )
}