import type { Metadata } from "next";
import { auth } from "@forge/auth";
import { SIGN_IN_PATH } from "~/consts";
import { redirect } from "next/navigation";
import { api, HydrateClient } from "~/trpc/server";
import { ResponsePieChart } from "./_components/ResponsePieChart";
import { ResponseBarChart } from "./_components/ResponseBarChart";
import type { FormType } from "@forge/consts/knight-hacks";
import { ResponsesTable } from "./_components/ResponsesTable";
import { ResponseHorizontalBarChart } from "./_components/ResponseHorizontalBarChart";

export const metadata: Metadata = {
    title: "Blade | Form Responses",
    description: "View Form Responses",
};

export default async function FormResponsesPage({
    params,
}: {
    params: {"form-id": string };
}) {

    // auth check - currently disabled for development
    // re-enable this when discord oauth is set up in production
    // const session = await auth();
    // if (!session) {
    //     redirect(SIGN_IN_PATH);
    // }

    // admin check - currently disabled for development
    // re-enable this when discord oauth is set up in production
    // const isAdmin = await api.auth.getAdminStatus();
    // if (!isAdmin) {
    //     redirect("/");
    // }

    // get the form id from the url parameter
    const formId = params["form-id"];

    // todo for backend integration:
    // 1. replace this mock data with: const apiResponses = await api.forms.getResponses({ form: formId });
    // 2. add type assertion: const responses = apiResponses as Array<{...}>; (see original code)
    // 3. make sure database connection is working (check .env file)
    // 4. change adminProcedure back in packages/api/src/routers/forms.ts line 118 ( i might have done this already but just in case )
    // 5. re-enable auth checks above
    // mock data for development - matches the structure the api will return

    const responses = [
        {
            submittedAt: new Date("2024-01-15"),
            member: { firstName: "John", lastName: "Doe", email: "john@example.com", id: "1" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "JavaScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 3 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["JavaScript", "TypeScript", "Python"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "I'm passionate about learning new technologies and collaborating with other developers. Knight Hacks seems like a great community!" }
            ]
        },
        {
            submittedAt: new Date("2024-01-16"),
            member: { firstName: "Jane", lastName: "Smith", email: "jane@example.com", id: "2" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Python" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 5 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Python", "Java", "C++", "Go"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "The hackathons look really exciting and I want to build cool projects with a team." }
            ]
        },
        {
            submittedAt: new Date("2024-01-17"),
            member: { firstName: "Bob", lastName: "Johnson", email: "bob@example.com", id: "3" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "JavaScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 2 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Beginner" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 3 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["JavaScript", "HTML", "CSS"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "I'm new to coding and want to learn from experienced developers." }
            ]
        },
        {
            submittedAt: new Date("2024-01-18"),
            member: { firstName: "Alice", lastName: "Williams", email: "alice@example.com", id: "4" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "TypeScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 4 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["TypeScript", "JavaScript", "Python", "Rust"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Looking forward to networking and participating in competitions!" }
            ]
        },
        {
            submittedAt: new Date("2024-01-19"),
            member: { firstName: "Charlie", lastName: "Brown", email: "charlie@example.com", id: "5" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Python" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 1 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Beginner" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 2 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Python"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Want to meet other CS students and improve my skills." }
            ]
        },
        {
            submittedAt: new Date("2024-01-20"),
            member: { firstName: "David", lastName: "Davis", email: "david@example.com", id: "6" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "JavaScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 3 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["JavaScript", "TypeScript", "Python", "Java"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Interested in the workshops and mentorship opportunities available." }
            ]
        },
        {
            submittedAt: new Date("2024-01-21"),
            member: { firstName: "Emma", lastName: "Garcia", email: "emma@example.com", id: "7" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Rust" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 6 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Rust", "C++", "Go", "Python"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "I want to contribute to open source projects and meet like-minded developers." }
            ]
        },
        {
            submittedAt: new Date("2024-01-22"),
            member: { firstName: "Frank", lastName: "Miller", email: "frank@example.com", id: "8" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "C++" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 8 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["C++", "C", "Rust", "Assembly"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Looking to mentor beginners and work on low-level systems projects." }
            ]
        },
        {
            submittedAt: new Date("2024-01-23"),
            member: { firstName: "Grace", lastName: "Lee", email: "grace@example.com", id: "9" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Java" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 4 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 3 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Java", "Kotlin", "Python"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "I'm interested in Android development and want to build mobile apps." }
            ]
        },
        {
            submittedAt: new Date("2024-01-24"),
            member: { firstName: "Henry", lastName: "Taylor", email: "henry@example.com", id: "10" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Go" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 5 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Go", "Python", "JavaScript", "Rust"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Passionate about backend development and microservices architecture." }
            ]
        },
        {
            submittedAt: new Date("2024-01-25"),
            member: { firstName: "Ivy", lastName: "Martinez", email: "ivy@example.com", id: "11" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Python" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 2 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Beginner" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 3 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Python", "R"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "I'm studying data science and want to learn machine learning." }
            ]
        },
        {
            submittedAt: new Date("2024-01-26"),
            member: { firstName: "Jack", lastName: "Anderson", email: "jack@example.com", id: "12" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "TypeScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 7 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["TypeScript", "JavaScript", "Go", "Python", "Rust"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "I want to share my knowledge and collaborate on full-stack projects." }
            ]
        },
        {
            submittedAt: new Date("2024-01-27"),
            member: { firstName: "Kate", lastName: "Thomas", email: "kate@example.com", id: "13" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Ruby" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 3 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Ruby", "JavaScript", "Python"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "I love Ruby on Rails and want to build web applications with others." }
            ]
        },
        {
            submittedAt: new Date("2024-01-28"),
            member: { firstName: "Liam", lastName: "Jackson", email: "liam@example.com", id: "14" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "C#" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 5 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["C#", "F#", "TypeScript", "JavaScript"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Working with .NET and Unity, interested in game development and enterprise apps." }
            ]
        },
        {
            submittedAt: new Date("2024-01-29"),
            member: { firstName: "Mia", lastName: "White", email: "mia@example.com", id: "15" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "JavaScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 1 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Beginner" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 2 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["JavaScript", "HTML", "CSS"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Just started learning web development and excited to build my first projects!" }
            ]
        },
        {
            submittedAt: new Date("2024-01-30"),
            member: { firstName: "Noah", lastName: "Harris", email: "noah@example.com", id: "16" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Swift" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 4 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Swift", "Objective-C", "JavaScript"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "iOS developer looking to collaborate on mobile app projects." }
            ]
        },
        {
            submittedAt: new Date("2024-01-31"),
            member: { firstName: "Olivia", lastName: "Clark", email: "olivia@example.com", id: "17" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Kotlin" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 3 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 3 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Kotlin", "Java", "Python"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Android developer wanting to expand my skills and network." }
            ]
        },
        {
            submittedAt: new Date("2024-02-01"),
            member: { firstName: "Paul", lastName: "Lewis", email: "paul@example.com", id: "18" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Rust" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 2 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Beginner" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 3 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Rust", "C++"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Learning systems programming and want to work on performance-critical applications." }
            ]
        },
        {
            submittedAt: new Date("2024-02-02"),
            member: { firstName: "Quinn", lastName: "Walker", email: "quinn@example.com", id: "19" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Python" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 6 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Python", "JavaScript", "R", "SQL"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Data scientist with ML/AI experience, looking to mentor and work on AI projects." }
            ]
        },
        {
            submittedAt: new Date("2024-02-03"),
            member: { firstName: "Rachel", lastName: "Hall", email: "rachel@example.com", id: "20" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "JavaScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 4 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["JavaScript", "TypeScript", "React", "Node.js"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Full-stack developer interested in building scalable web applications." }
            ]
        },
        {
            submittedAt: new Date("2024-02-04"),
            member: { firstName: "Sam", lastName: "Allen", email: "sam@example.com", id: "21" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Go" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 3 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Go", "Python", "Docker", "Kubernetes"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "DevOps engineer looking to build cloud-native applications." }
            ]
        },
        {
            submittedAt: new Date("2024-02-05"),
            member: { firstName: "Tina", lastName: "Young", email: "tina@example.com", id: "22" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "TypeScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 2 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 3 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["TypeScript", "JavaScript", "HTML", "CSS"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Frontend developer passionate about creating beautiful user interfaces." }
            ]
        },
        {
            submittedAt: new Date("2024-02-06"),
            member: { firstName: "Uma", lastName: "King", email: "uma@example.com", id: "23" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Python" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 1 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Beginner" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 2 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Python"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Complete beginner eager to learn and start my coding journey!" }
            ]
        },
        {
            submittedAt: new Date("2024-02-07"),
            member: { firstName: "Victor", lastName: "Wright", email: "victor@example.com", id: "24" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "JavaScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 5 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["JavaScript", "TypeScript", "Python", "Go", "Rust"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Senior engineer looking to give back and help the next generation of developers." }
            ]
        },
        {
            submittedAt: new Date("2024-02-08"),
            member: { firstName: "Wendy", lastName: "Lopez", email: "wendy@example.com", id: "25" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Java" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 7 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Java", "Kotlin", "Scala", "Python"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Backend engineer with experience in distributed systems and microservices." }
            ]
        },
        {
            submittedAt: new Date("2024-02-09"),
            member: { firstName: "Xavier", lastName: "Hill", email: "xavier@example.com", id: "26" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "C++" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 10 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["C++", "C", "Rust", "Python", "Assembly"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Veteran systems programmer interested in mentoring and working on compiler/OS projects." }
            ]
        },
        {
            submittedAt: new Date("2024-02-10"),
            member: { firstName: "Yara", lastName: "Scott", email: "yara@example.com", id: "27" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Python" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 3 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Python", "JavaScript", "SQL"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Web developer transitioning into data engineering and analytics." }
            ]
        },
        {
            submittedAt: new Date("2024-02-11"),
            member: { firstName: "Zack", lastName: "Green", email: "zack@example.com", id: "28" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Rust" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 4 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Rust", "Go", "C++", "WebAssembly"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Passionate about memory safety and building high-performance web services." }
            ]
        },
        {
            submittedAt: new Date("2024-02-12"),
            member: { firstName: "Amy", lastName: "Adams", email: "amy@example.com", id: "29" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "TypeScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 1 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Beginner" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 1 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["TypeScript", "JavaScript"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Bootcamp graduate looking to gain real-world experience and build portfolio projects." }
            ]
        },
        {
            submittedAt: new Date("2024-02-13"),
            member: { firstName: "Ben", lastName: "Baker", email: "ben@example.com", id: "30" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "JavaScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 6 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["JavaScript", "TypeScript", "Python", "Java", "C#"] },
                { question: "Why do you want to join Knight Hacks?", type: "PARAGRAPH", answer: "Tech lead interested in sharing architecture and design patterns knowledge with the community." }
            ]
        }
    ];

    return (
        <HydrateClient>
          <main className="container py-8">
              {/* page header with title and response count */}
              <div className="mb-8">
                  <h1 className="text-3xl font-bold">Form Responses for: {formId}</h1>
                  <p className="text-muted-foreground mt-2">
                      {responses.length} {responses.length === 1 ? 'response' : 'responses'}
                  </p>
              </div>

              {/* charts section , shows aggregated data visualization */}
              {/* space-y-6 adds vertical spacing between charts */}
              {/* max-w-4xl mx-auto centers the charts and limits width */}
              <div className="space-y-6 max-w-4xl mx-auto">
                  {/* pie chart for categorical multiple choice questions */}
                  <ResponsePieChart
                      question="What is your favorite programming language?"
                      responses={responses}
                  />

                  {/* bar chart for numeric linear scale questions */}
                  <ResponseBarChart
                      question="How many years of experience do you have?"
                      responses={responses}
                  />

                  <ResponsePieChart
                      question="What is your skill level?"
                      responses={responses}
                  />

                  <ResponseBarChart
                      question="Rate your experience (1-5)"
                      responses={responses}
                  />

                  {/* horizontal bar chart for checkbox/multi-select questions */}
                  <ResponseHorizontalBarChart
                      question="Which programming languages do you know?"
                      responses={responses}
                  />
              </div>

              {/* text responses section - for SHORT_ANSWER and PARAGRAPH questions */}
              {/* filters responses to only show text-based questions that can't be visualized in charts */}
              <div className="mt-8 max-w-4xl mx-auto">
                  <ResponsesTable
                      responses={responses}
                      filterQuestionTypes={["SHORT_ANSWER", "PARAGRAPH"]}
                  />
              </div>
          </main>
      </HydrateClient>
    )
}