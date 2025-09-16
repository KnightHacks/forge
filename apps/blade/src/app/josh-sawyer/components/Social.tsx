export interface socialCard {
    key: number
    img: string,
    link: string,
    altText: string,
}

import Image from 'next/image'


export default function Social(social: socialCard) {
    return (
        <a 
            className="transition delay-100 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110 px-5 motion-reduce:transition-none motionreduce:hover:transform-none"
            href={social.link}
            target="_blank"
        >
            <Image
                className="h-15 md:h-20 w-15 md:w-20 rounded"
                src={social.img}
                alt={social.altText}
                draggable="false"
                width={500}
                height={500}
            />
        </a>
    )
}