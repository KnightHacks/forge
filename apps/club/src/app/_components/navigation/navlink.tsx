import Link from "next/link";
import { motion } from "framer-motion";

const NavLink = ({
  linkName,
  isActive,
  children,
  className,
}: {
  linkName: string;
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="inline-block"
    >
      <Link
        href={`/${linkName}`}
        className={`${className} group relative inline-block rounded-lg px-3 py-2 text-white transition-all duration-300 ease-in-out ${
          isActive
            ? "bg-violet-600/20 text-violet-400"
            : "text-gray-300 hover:bg-white/10"
        }`}
      >
        {children}
        <span
          className={`absolute bottom-0 left-0 h-0.5 w-full transition-all duration-300 ease-in-out ${
            isActive
              ? "bg-violet-600"
              : "bg-transparent group-hover:bg-gray-300"
          }`}
        />
      </Link>
    </motion.div>
  );
};

export default NavLink;
