import Link from "next/link";

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
    <Link
      href={`/${linkName}`}
      className={`${className} border-b-2 pb-2 transition-all duration-200 ease-in-out ${
        isActive
          ? "border-violet-600 text-violet-600"
          : "border-transparent hover:border-gray-300 hover:text-gray-300"
      }`}
    >
      {children}
    </Link>
  );
};

export default NavLink;
