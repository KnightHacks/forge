import { Button } from "@forge/ui/button";
import Link from "next/link";

export default function NotFoundPage() {
    return (
        <main className="flex flex-col items-center text-center justify-center h-screen gap-2">
            <h1 className="text-4xl font-bold"><span className="text-primary">404</span> &mdash; Page Not Found</h1>
            <p>It seems like you've ventured off course. Click below to return to <b>Blade</b>!</p>
            <Link href="/">
                <Button>Go To Blade</Button>
            </Link>
        </main>
    );
}