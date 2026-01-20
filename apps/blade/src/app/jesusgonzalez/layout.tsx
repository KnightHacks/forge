import React from "react";
import NavBar from "./_components/NavBar";
import Footer from "./_components/Footer";

export default function Layout({ children } : { children: React.ReactNode }){
    return (
        <div className='flex min-h-screen flex-col'>
            <NavBar />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}