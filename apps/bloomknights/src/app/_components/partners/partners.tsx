"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Card, CardContent } from "@forge/ui/card";

import { partnerLogos } from "./partnerLogos";

const Partners = () => {
  return (
    <motion.div
      id="partners"
      className="flex h-screen w-full scroll-mt-32 flex-col items-center justify-center gap-2 px-4 sm:gap-3 sm:px-6 md:gap-4 md:px-8"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.2 }}
    >
      <span className="spring-heading animate-float-bob-slow mb-6 text-3xl sm:mb-8 sm:text-4xl md:mb-10 md:text-5xl lg:text-6xl">
        PARTNERS
      </span>

      <div className="xs:max-w-[90%] xs:grid-cols-2 grid w-full max-w-[95%] grid-cols-1 gap-3 sm:max-w-[85%] sm:gap-4 md:max-w-[80%] md:grid-cols-2 md:gap-6 lg:max-w-6xl lg:grid-cols-4">
        {partnerLogos.map((LogoPair, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: idx * 0.15, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ scale: 1.08 }}
          >
            <Link
              href={LogoPair.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="partner-card group relative w-full overflow-hidden rounded-2xl border border-[rgba(200,180,140,0.38)] bg-[rgba(248,243,232,0.55)] px-4 backdrop-blur-md transition-all duration-500 hover:border-[rgba(168,196,144,0.6)] hover:bg-[rgba(248,243,232,0.78)] hover:shadow-[0_8px_40px_rgba(180,140,80,0.28)] sm:px-6 md:px-8 lg:px-10">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgba(184,212,232,0.15)] via-transparent to-[rgba(168,196,144,0.12)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <CardContent>
                  <div className="xs:h-16 relative h-12 w-full sm:h-20 md:h-24 lg:h-28">
                    <LogoPair.white
                      className="absolute inset-0 h-full w-full opacity-100 transition-opacity duration-500 group-hover:opacity-0"
                      width="100%"
                      height="100%"
                    />
                    <LogoPair.color
                      className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      width="100%"
                      height="100%"
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Partners;
