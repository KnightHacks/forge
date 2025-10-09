import type { ComponentType, SVGProps } from "react";
import type { ButtonProps } from "rsuite";

import MenuHorizontalSVG from "./assets/menu horizontal";

interface Props extends ButtonProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  href?: string;
}

export default function Button({ icon: Icon, href, ...props }: Props) {
  const innerText = props.children;

  if (!href) {
    return (
      <>
        <button
          className="font-pragati transition-color group relative inline-flex transform items-center gap-2 rounded-[200px] border border-[#D8B4FE] bg-transparent bg-gradient-to-br px-14 py-3 text-[12px] font-normal leading-normal tracking-[1px] text-white duration-100 hover:bg-[#D8B4FE] hover:text-[#0F172A] md:px-24 md:text-[13px] md:font-bold md:tracking-[.8px]"
          {...props}
        >
          {Icon && (
            <Icon
              className="absolute left-6 h-4 w-4 fill-current md:left-14 md:h-5 md:w-5 [&_*]:transition-colors [&_*]:duration-100 group-hover:[&_*]:fill-[#0F172A]"
              aria-hidden="true"
            />
          )}
          {innerText}
          {
            <MenuHorizontalSVG
              className="md:right-15 absolute right-6 h-4 w-4 fill-current md:h-5 md:w-5 [&_*]:transition-colors [&_*]:duration-100 group-hover:[&_*]:fill-[#0F172A]"
              aria-hidden="true"
            />
          }
        </button>
      </>
    );
  } else {
    return (
      <a
        href={href}
        className="font-pragati transition-color group relative inline-flex transform items-center gap-2 rounded-[200px] border border-[#D8B4FE] bg-transparent bg-gradient-to-br px-14 py-3 text-[12px] font-normal leading-normal tracking-[1px] text-white duration-100 hover:bg-[#D8B4FE] hover:text-[#0F172A] md:px-24 md:text-[13px] md:font-bold md:tracking-[.8px]"
        {...props}
      >
        {Icon && (
          <Icon
            className="absolute left-6 h-4 w-4 fill-current md:left-14 md:h-5 md:w-5 [&_*]:transition-colors [&_*]:duration-100 group-hover:[&_*]:fill-[#0F172A]"
            aria-hidden="true"
          />
        )}
        {innerText}
        {
          <MenuHorizontalSVG
            className="md:right-15 absolute right-6 h-4 w-4 fill-current md:h-5 md:w-5 [&_*]:transition-colors [&_*]:duration-100 group-hover:[&_*]:fill-[#0F172A]"
            aria-hidden="true"
          />
        }
      </a>
    );
  }
}
