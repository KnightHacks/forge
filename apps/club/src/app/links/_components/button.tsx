import type { ComponentType, SVGProps } from "react";
import type { ButtonProps } from "rsuite";

interface Props extends ButtonProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>,
  href?: string,
}

export default function Button({icon: Icon, href, ...props}: Props) {
    const innerText = props.children;

    if (!href) {
        return <>
            <button className="group transform relative inline-flex items-center font-pragati md:text-[13px] md:font-bold md:tracking-[.8px] text-[12px] font-normal leading-normal tracking-[1px] gap-2 px-14 md:px-24 py-3 rounded-[200px] border border-[#D8B4FE] bg-transparent text-white bg-gradient-to-br hover:bg-[#D8B4FE] hover:text-[#0F172A] transition-color duration-100" {...props}>
                {Icon && <Icon className="absolute md:left-14 left-6 md:w-5 md:h-5 w-4 h-4 fill-current group-hover:[&_*]:fill-[#0F172A] [&_*]:transition-colors [&_*]:duration-100" aria-hidden="true" />}
                {innerText}
            </button>
        </>
    } else {
        return <a href={href} className="group transform relative inline-flex items-center font-pragati md:text-[13px] md:font-bold md:tracking-[.8px] text-[12px] font-normal leading-normal tracking-[1px] gap-2 px-14 md:px-24 py-3 rounded-[200px] border border-[#D8B4FE] bg-transparent text-white bg-gradient-to-br hover:bg-[#D8B4FE] hover:text-[#0F172A] transition-color duration-100" {...props}>
                {Icon && <Icon className="absolute md:left-14 left-6 md:w-5 md:h-5 w-4 h-4 fill-current group-hover:[&_*]:fill-[#0F172A] [&_*]:transition-colors [&_*]:duration-100" aria-hidden="true" />}
                {innerText}
        </a>
    }
}