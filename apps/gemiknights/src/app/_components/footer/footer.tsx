import Link from "next/link";
import { Separator } from "../ui/separator";
import { footerLinks, footerMessage } from "./footerContent";

export default function Footer() {
  return (
    <div className="w-full tk-peridot-devanagari text-white font-semibold">
      <div className="flex flex-col items-center justify-center w-full">
        <div className="w-4/5">
          <Separator className="mt-10 mb-4 h-[1px] bg-white" />
        </div>
        <div className="flex flex-row items-center justify-center my-10">
          {footerLinks.map((link, index) => (
            <>
              <div key={index} className="flex flex-row items-center justify-center mx-10">
                <Link 
                  href={link.href} 
                  className="text-center text-lg transform transition hover:scale-105 hover:text-[#FBB03B] duration-300"
                  {...(link.text === "Hackers Guide" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {link.text}
                </Link>
              </div><div>
                  {index < footerLinks.length - 1 && (
                    <Separator
                      orientation="vertical"
                      className="mx-2 h-6 w-[1px] bg-white data-[orientation=vertical]:h-6" />
                  )}
                </div>
              </>
          ))}
        </div>
        <div className="flex justify-center my-10">
          <span className="justify-center items-center"> {footerMessage} </span>
        </div>
      </div>
    </div>
  );
} 