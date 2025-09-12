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
            className="hover:-motion-rotate-loop-10 hover:motion-duration-1000 px-5 motion-reduce:transition-none motionreduce:hover:transform-none"
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