import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  SVGProps,
} from "react";

import MenuHorizontalSVG from "./assets/menu-horizontal";

type Base = {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

type ButtonVariant = Base &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type AnchorVariant = Base &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type Props = ButtonVariant | AnchorVariant;

export default function Button({ icon: Icon, href, ...props }: Props) {
  const innerText = props.children;

  if (!href) {
    return (
      <>
        <button
          className="font-pragati transition-color bg-linear-to-br group relative inline-flex transform items-center gap-2 rounded-[200px] border border-[#D8B4FE] bg-transparent px-14 py-3 text-[12px] font-normal leading-normal tracking-[1px] text-white duration-100 hover:bg-[#D8B4FE] hover:text-[#0F172A] md:px-24 md:text-[13px] md:font-bold md:tracking-[.8px]"
          {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {Icon && (
            <Icon
              className="**:transition-colors **:duration-100 group-hover:**:fill-[#0F172A] absolute left-6 h-4 w-4 fill-current md:left-14 md:h-5 md:w-5"
              aria-hidden="true"
            />
          )}
          {innerText}
          {
            <MenuHorizontalSVG
              className="md:right-15 **:transition-colors **:duration-100 group-hover:**:fill-[#0F172A] absolute right-6 h-4 w-4 fill-current md:h-5 md:w-5"
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
        className="font-pragati transition-color bg-linear-to-br group relative inline-flex transform items-center gap-2 rounded-[200px] border border-[#D8B4FE] bg-transparent px-14 py-3 text-[12px] font-normal leading-normal tracking-[1px] text-white duration-100 hover:bg-[#D8B4FE] hover:text-[#0F172A] md:px-24 md:text-[13px] md:font-bold md:tracking-[.8px]"
        {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {Icon && (
          <Icon
            className="**:transition-colors **:duration-100 group-hover:**:fill-[#0F172A] absolute left-6 h-4 w-4 fill-current md:left-14 md:h-5 md:w-5"
            aria-hidden="true"
          />
        )}
        {innerText}
        {
          <MenuHorizontalSVG
            className="md:right-15 **:transition-colors **:duration-100 group-hover:**:fill-[#0F172A] absolute right-6 h-4 w-4 fill-current md:h-5 md:w-5"
            aria-hidden="true"
          />
        }
      </a>
    );
  }
}
