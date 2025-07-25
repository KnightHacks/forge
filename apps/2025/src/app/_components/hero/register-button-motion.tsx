"use client";

import { motion } from "framer-motion";
import RegisterButton from "./register-button";

export default function RegisterButtonMotion({ url }: { url: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
      className="w-full flex items-center justify-center"
    >
      <RegisterButton url={url} />
    </motion.div>
  );
}
