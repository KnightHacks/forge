import React from "react";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";

export default function Layout({ children } : { children: React.ReactNode }){
    return (
        <div className='flex min-h-screen flex-col'>
            <NavBar />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}