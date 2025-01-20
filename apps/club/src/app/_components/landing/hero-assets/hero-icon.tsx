import type { SVGProps } from "react";
import * as React from "react";

const HeroSVG = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1440 850"
    className="h-screen w-full"
    width="100%"
    preserveAspectRatio="xMidYMid meet"
    fill="none"
    {...props}
  >
    <g filter="url(#a)">
      <g fill="#D8B4FE" clipPath="url(#b)">
        <path d="M221.669 399.221c-2.833-1.985-5.217-4.513-6.799-7.474-.118-.696-.299-1.648-.488-2.825a43.998 43.998 0 0 0 2.471 4.201c2.069 3.113 3.879 4.977 4.816 6.098ZM149.79 530.123c-.197-.04-.433.217-.669.617.023-.056.023-.08.015-.08-.015 0-.118.184-.188.416l-.008.016c-.512 1.024-.944 2.536-.834 2.84.015.032.149.392.283.376.055-.008.236-.072.559-2.472.196.224.637.048 1.274-.184-.047-.928-.181-1.472-.432-1.529ZM79.515 511.871s.063.208.181.624c-.676.632-1.078 1.016-1.156.944-.016-.008-.024-.04-.024-.072 0-.32.48-1.416 1-1.496ZM98.738 499.628c2.589-1.008 3.974-1.44 4.627-1.576a517.661 517.661 0 0 1-6.035 3.409c-10.568 5.873-30.68 16.5-31.136 15.684-.401-.713 16.327-11.235 32.544-17.517ZM140.938 473.934c.062.104-1.275 1.145-3.707 2.857.095-.368.189-.736.276-1.096 2.825-1.593 3.391-1.817 3.431-1.761Z" />
        <path d="M214.988 393.123c-.126.032-.441-.656-.795-1.624.173-.016.347-.024.52-.04.047.096.102.192.157.288.15.872.212 1.352.118 1.376ZM364.931 338.606c1.432-1.384 1.188-3.696-.488-4.713-9.521-5.793-20.836-11.859-34.354-17.148a206.231 206.231 0 0 0-41.011-11.258 113.707 113.707 0 0 1 15.564 6.273c7.137 3.513 13.062 7.354 17.728 10.867 5.524 4.113 11.079 7.417 17.791 12.851a195.706 195.706 0 0 1 13.36 11.77c.457.425 1.126.393 2.29.208l9.151-8.826-.031-.032v.008ZM449.258 436.677c-2.675-7.449-4.162-11.618-6.13-15.811-3.477-7.418-6.814-12.635-9.835-17.324a219.827 219.827 0 0 0-15.375-20.949c-.425-.544-1.314-.6-1.826-.104l-24.211 24.037a.99.99 0 0 0-.284.504c-.629 2.721-1.314 6.546-1.715 11.139-.283 3.513-.197 5.978-.283 9.17-.394 13.187-.653 23.15 1.054 23.382.457.08.63-.544 2.801-3.193 1.393-1.736 3.187-3.937 5.697-5.929a27.745 27.745 0 0 1 4.847-3.089c2.998-1.496 5.28-2.625 6.877-2.017 2.935 1.073 2.652 7.602 2.542 9.747-1.716 31.823-12.755 63.175-17.885 73.505-5.902 11.587-18.995 33.208-44.859 51.716-13.195 9.443-33.205 15.892-73.429 28.495-9.796 1.816-16.146 1.544-20.191.904 0 0-1.141-.176-2.423-.376l-4.328-1.224-12.377 45.25-50.461-3.408-.11.16-.488.72-.331-.232-1.007-.704-.126-.088 1.558.104.504.04 8.813-13.067-1.322-.921-.047-.04c-.827-.688-1.244-1.024-1.385-1.12-3.219-2.168-6.216-4.681-9.529-6.697-2.754-1.673-6.625-4.321-11.079-8.418l-1.267 1.144c-.299.456-.669.936-1.117 1.424a11.733 11.733 0 0 1-3.462 2.569c-1.818.264-2.99.424-2.99.424s-2.542-1.176-6.484-3.009a1023.147 1023.147 0 0 1-13.432 12.995 985.102 985.102 0 0 1-10.189 9.554 40.854 40.854 0 0 0 2.431 2.849c4.556 4.905 9.112 7.522 11.968 9.13 0 0 24.337 13.716 38.579 18.437.835.272 1.684.544 1.684.544.26.088.543.176.834.264 10.198 3.217 38.895 11.227 76.593 9.986 13.66-.448 36.872-1.496 64.766-11.298 18.019-6.338 36.211-16.276 56.748-32.344 13.974-10.931 46.88-39.657 62.625-87.973 0 0 18.161-55.725-.944-108.858Zm-208.28 220.244-1.354-.384 1.661.112c-.103.08-.205.168-.307.272Zm11.968-7.417.047-.688c.449.048.897.104 1.346.152-.457.168-.921.344-1.393.536Zm.771-48.5c.087-.072.401.216.622.424a6.617 6.617 0 0 0-.622-.424Z" />
        <path
          stroke="#DBC34C"
          strokeMiterlimit={10}
          strokeWidth={0.14}
          d="M254.339 601.428a6.617 6.617 0 0 0-.622-.424c.087-.072.402.216.622.424Z"
        />
        <path d="m225.524 510.847.079.08v-.08h-.079ZM158.311 557.682c-.149.128-.291.264-.433.392l.567.624.519-.488c-.228-.184-.44-.36-.653-.528Z" />
        <path d="M213.887 585.921a233.232 233.232 0 0 1 18.058-23.966c1.487-1.728 7.963-9.202 17.507-18.244a264.319 264.319 0 0 1 17.98-15.58 347.256 347.256 0 0 0-2.809-5.137 295.933 295.933 0 0 0-5.752-9.842c-2.974-3.505-5.854-5.874-7.987-7.41-2.25-1.625-4.083-2.609-7.435-4.425-2.07-1.121-4.832-2.601-8.648-4.137-3.092-1.257-3.36-1.12-4.957-1.849-2.345-1.072-5.508-3.072-8.695-7.129a4027.39 4027.39 0 0 1-5.87 6.985 184.65 184.65 0 0 1-19.836 19.581c-13.92 11.819-27.666 19.965-39.044 25.566-.708 2.224-1.503 4.713-2.219 6.946-.74 2.312-1.471 4.633-2.211 6.953-10.654-8.186-21.308-16.364-31.962-24.55l16.477-31.871-43.199 24.79 10.316 32.8 4.847-4.378c3.934 3.193 7.908 6.386 11.921 9.579a2109.745 2109.745 0 0 0 18.247 14.387c-1.621 3.025-3.25 6.05-4.87 9.074 1.062 1.265 2.132 2.521 3.194 3.785-20.836 21.557-41.68 43.106-62.515 64.663-.449.04-9.781.961-13.503 8.61-3.367 6.922.37 14.164 4.029 17.909 4.296 4.417 12.503 8.146 19.962 4.473 5.76-2.833 9.207-9.17 8.672-15.94l65.985-62.591c.315.184.63.376.952.568a82.24 82.24 0 0 1 6.161 4.145 335.008 335.008 0 0 0 5.587-3.745c1.29-.88 2.549-1.752 3.793-2.632a202.553 202.553 0 0 0 10.307 9.434 204.45 204.45 0 0 0 15.336 11.899 241.006 241.006 0 0 1-2.935 5.033 211.996 211.996 0 0 1-3.47 5.569c12.464.889 24.928 1.777 37.399 2.657 5.17-16.524 10.339-33.056 15.501-49.58-1.235 1.121-12.29 11.139-13.565 12.291-.779.704-9.907 8.978-10.701 9.69-8.664-6.625-17.335-13.251-25.998-19.876.071-.024 6.043-1.713 6.114-1.729.181-.056 9.647-2.728 9.836-2.776Zm11.645-66.048.063-.624h.181c-.016.056-.032.104-.047.152-.055.168-.103.344-.158.52-.015.048-.039.104-.055.16l.016-.2v-.008Zm-.559-.616v.072l-.07-.072h.07Zm-.661 13.675s.055-.08.079-.112l-.024.224a11.715 11.715 0 0 0 .244.416l-.196.176-.103.096.055-.688a.827.827 0 0 1-.055-.112Zm-65.867 25.766-.567-.624c.142-.128.284-.264.433-.392.213.168.425.344.653.528l-.519.488Zm20.844 16.036-.756.648a43.887 43.887 0 0 0-3.8-3.305 42.51 42.51 0 0 0-3.525-2.456l1.243-1.312c12.542-13.26 25.1-26.527 37.643-39.786 4.391-.896 8.773-1.784 13.164-2.68l-1.18 11.882-42.789 37.009Z" />
        <path d="m158.964 558.21-.519.488-.567-.624c.142-.128.284-.264.433-.392.213.168.425.344.653.528ZM224.989 525.843l-.024.248c-.023-.04-.039-.08-.055-.12l.079-.128ZM224.902 526.851l.063-.76c.079.168.166.32.26.456l-.323.304ZM248.988 457.13c-1.794 7.258 8.829 15.036 11.04 16.652 3.391 2.481 6.224 4.553 10.363 4.849 4.886.352 7.31-2.096 9.985-.432 1.361.849 2.195 3.297 3.792 8.154 1.834 5.554 1.787 6.874 3.101 7.474 2.321 1.064 6.46-1.232 7.931-4.417.488-1.056.771-2.409.346-5.433-.755-5.346-2.777-9.259-3.446-10.531-4.918-9.338-7.381-14.011-7.585-14.275-4.627-5.914-15.179-15.596-23.795-12.915-3.525 1.096-6.845 4.297-7.514 4.961-1.991 1.968-3.651 3.609-4.218 5.905v.008ZM307.365 416.585a239.1 239.1 0 0 0 26.052 42.234l106.186-109.546 3.958-48.171-46.825 7.585-91.346 101.304 1.975 6.602v-.008ZM214.988 393.123c-.393.104-2.683-7.041-2.25-7.225.181-.072.645 1.112 1.644 3.024.433 2.649.779 4.153.606 4.201Z" />
        <path d="m158.964 558.21-.519.488-.567-.624c.142-.128.284-.264.433-.392.213.168.425.344.653.528ZM224.989 525.843l-.024.248c-.023-.04-.039-.08-.055-.12l.079-.128ZM225.603 510.847v.08l-.079-.08h.079ZM226.445 510.831l-.048.168c-.055.184-.11.376-.165.568l-.039-.04.063-.688h.126l.063-.008Z" />
        <path d="m224.989 525.843-.024.248c-.023-.04-.039-.08-.055-.12l.079-.128ZM226.398 510.999c-.071.24-.142.488-.221.744l.079-.904h.126l.016.16Z" />
        <path d="m224.989 525.843-.024.248c-.023-.04-.039-.08-.055-.12l.079-.128ZM224.902 526.851l.063-.76c.079.168.166.32.26.456l-.323.304Z" />
        <path d="m224.989 525.843-.024.248c-.023-.04-.039-.08-.055-.12l.079-.128ZM225.028 526.211l-.015.536-.111.104.063-.76s.04.08.063.12ZM225.603 510.847v.08l-.079-.08h.079ZM179.288 574.734l-.755.648a43.716 43.716 0 0 0-7.325-5.761l1.243-1.312 6.837 6.425ZM231.166 406.238c.573 0 1.038-.473 1.038-1.056 0-.583-.465-1.056-1.038-1.056-.574 0-1.039.473-1.039 1.056 0 .583.465 1.056 1.039 1.056Z" />
        <path
          stroke="#DBC34C"
          strokeMiterlimit={10}
          strokeWidth={0.14}
          d="M254.339 601.428a6.617 6.617 0 0 0-.622-.424c.087-.072.402.216.622.424Z"
        />
        <path d="m234.849 596.531-10.521 8.226-20.112-13.443c1.204-.128 2.408-.264 3.604-.4.087.048.173.104.26.152-.055-.072-.071-.128-.047-.176.102-.024.212-.048.314-.08a29922 29922 0 0 0 9.065-2.233l13.691 6.218h.008c.566.192 1.062.408 1.495.68h.008c.747.352 1.487.704 2.235 1.056Z" />
        <path d="M208.347 590.81c-.102.032-.212.056-.315.08.032-.072.134-.088.315-.08ZM341.915 474.366c-8.466-6.161-13.659-12.867-16.563-17.3-9.725-11.09-15.43-21.285-18.798-28.518-4.847-10.379-7.357-20.005-9.206-26.951-2.785-10.554-2.597-13.243-5.02-21.813-.858-3.377-1.912-6.665-2.959-9.946-1.951-6.106-5.193-16.276-10.001-21.389-9.284-16.668-20.277-28.183-26.485-34.136-5.044-4.849-14.053-13.42-28.256-21.493-20.702-11.827-42.553-16.884-44.174-14.052-1.196 2.121 10.151 6.682 16.28 19.661 2.337 4.953 3.281 12.499 3.565 15.099.031.417-.394.705-.795.521-3.997-1.729-20.624-8.835-32.458-11.851-11.15-2.857-29.798-6.026-29.798-4.977 0 1.048 9.379 11.898 12.55 22.093 1.424 4.593 2.219 11.643 2.447 13.739.032.288-.251.496-.566.416-3.022-.808-16.398-4.401-25.612-5.473-7.641-.896-19.302-.784-22.756-.76-.401 0-.598.416-.338.68 2.022 2.176 8.325 9.178 11.464 15.363h.055a53.583 53.583 0 0 1 4.54 12.563c-13.455 9.163-23.086 22.414-28.673 32.024-11.59 14.235-33.748 45.755-38.54 90.925a171.4 171.4 0 0 0-.464 4.794c-.574 6.873-4.21 62.806 33.835 113.282a165.255 165.255 0 0 0 14.03 16.26c.023-.024.054-.048.078-.08l1.102 1.208 26.422-24.829-1.393-1.537a5.712 5.712 0 0 1-.755-2.528 5.817 5.817 0 0 1 .559-2.753c.606-1.272 1.4-1.736 2.809-3.001a31.09 31.09 0 0 0 3.076-3.185 538.248 538.248 0 0 0-16.169-13.875 454.827 454.827 0 0 0-5.611-4.569 52.93 52.93 0 0 1-5.98 7.042 65.913 65.913 0 0 1-1.77 1.664l-15.745-48.619 59.675-31.056c-1.479 4.537-3.958 10.667-7.192 18.685a236.205 236.205 0 0 1-10.473 22.437c7.042 5.825 14.085 11.659 21.127 17.492.787-5.961 1.361-11.419 1.243-13.971-.637.232-1.078.408-1.275.184-.322 2.401-.503 2.465-.558 2.473-.134.016-.268-.345-.283-.377-.111-.304.322-1.816.834-2.84l.007-.016c.071-.232.174-.416.189-.416.008 0 .008.024-.015.08.236-.4.472-.656.668-.616.252.056.386.6.433 1.528.48-.184 1.07-.392 1.747-.48 1.204-.16 2.25.104 2.99.376a37.125 37.125 0 0 1-2.054-7.602c-.464-2.969-1.282-10.498 2.432-20.725 7.16-19.732 22.409-25.406 20.379-37.953a15.755 15.755 0 0 0-.755-2.872c-1.786-3.985-6.059-5.146-10.678-16.156-2.313-5.45-5.704-13.811-3.596-23.854 1.684-8.122 6.531-15.227 8.357-15.043 2.053.208-5.445 19.604.716 33.864 4.445 10.25 11.834 16.203 20.899 23.357 6.617 5.217 10.15 6.922 42.804 24.038 15.061 7.89 27.351 14.467 34.111 24.982 3.879 6.025 5.5 12.475 5.5 12.475 1.628 6.425 0 15.387.857 15.387.858 0 45.402-22.933 44.631-23.749-.772-.809-8.152.104-14.085-1.937-6.248-2.152-10.355-5.457-12.464-7.418a63.463 63.463 0 0 1-7.931-11.17c-3.447-6.242-4.218-15.364-6.043-16.356-1.826-.992-6.358 1.048-11.205.264a29.684 29.684 0 0 1-11.465-4.433 112.951 112.951 0 0 1-10.693-15.988c-4.249-7.738-9.159-19.925-8.844-20.949.315-1.016 4.76-2.016 8.443-2.536 8.301-1.209 14.911 1.416 21.127 4.009 5.539 2.28 14.147 6.633 22.929 14.755a117.698 117.698 0 0 1 6.617 14.788c2.085 5.657 3.313 15.067 4.509 15.619 1.227.528 7.097-2.856 13.998-1.544 6.672 1.28 10.67 5.057 11.921 6.345a41.611 41.611 0 0 1 5.618 11.187c2.085 6.45.913 14.972 1.77 15.652 3.691 2.944 15.202-4.161 22.276-12.819 5.933-7.274 8.239-15.036 9.238-19.917-1.369-.84-13.778-4.641-22.363-10.883ZM65.982 517.433c-.024-.04-.024-.096-.016-.161l.07.217s-.046-.032-.054-.056Zm188.64-131.696c.071 5.362-1.605 10.619-5.429 14.188-1.857-13.099-5.713-27.535-10.237-37.121 5.303 2.089 9.709 6.378 12.164 10.379a23.756 23.756 0 0 1 1.653 3.328c.047 0 .094-.024.141-.032 1.102 4.305 1.692 6.754 1.865 8.186.04.344.079.68.11 1.008a3.231 3.231 0 0 1-.267.064Z" />
      </g>
    </g>
    <g filter="url(#c)">
      <path
        stroke="#D7B4FE"
        strokeMiterlimit={10}
        strokeWidth={7}
        d="M1388.99 339.795c-.03 1.572-4.24.962-7.48 1.199h-32.43c-11.23 0-9.98 0-9.98 8.414v114.18c0 7.208-3.74 10.819-11.22 10.819h-26.2c-6.65 0-9.98-3.205-9.98-9.614V353.012c0-8.813-4.56-13.217-13.71-13.217h-29.94c-4.99 0-7.48-1.199-7.48-6.009v-26.441c0-2.405 0-4.81 2.5-6.009 1.24-1.199 3.74-1.199 6.23-1.199h132.21c3.74 0 5.85-.637 7.1 2.967l.14 2.974s.25 15.69.25 22.898v10.819h-.01Z"
      />
    </g>
    <g filter="url(#d)">
      <path
        stroke="#D7B4FE"
        strokeMiterlimit={10}
        strokeWidth={7}
        d="M855.167 300.13c1.244 0 1.244 6.009 1.244 9.613V464.78c0 9.613 0 10.819-11.228 9.613-11.227-1.199-22.448 0-32.431 0-6.236 0-8.732-1.199-8.732-7.208v-159.84c0-2.405-.563-7.35 1.244-7.208h49.889l.014-.007Z"
      />
    </g>
    <g filter="url(#e)">
      <path
        stroke="#D7B4FE"
        strokeMiterlimit={10}
        strokeWidth={7}
        d="M600.733 301.336v-1.199"
      />
    </g>
    <g filter="url(#f)">
      <path
        stroke="#D7B4FE"
        strokeMiterlimit={10}
        strokeWidth={7}
        d="M488.61 302.535h43.519c2.496 1.199 1.245 4.81 1.245 7.208v72.109c0 2.405 0 4.81 1.244 7.208 2.496-1.199 3.74-3.604 4.992-6.009 17.463-25.242 36.172-49.278 53.628-74.514 1.245-2.405 3.741-6.009 7.481-7.208h49.888c3.74 2.405 0 4.81-1.244 6.009-18.708 26.441-37.417 54.082-56.125 80.523-3.74 3.604-3.74 10.819 0 14.423 49.889 68.505 99.777 137.01 149.673 205.515 13.716 19.226 28.684 39.658 42.408 58.891 1.244 1.2 2.495 3.604 1.244 4.81h-48.644c-3.74 0-7.48-1.199-9.976-4.81L618.182 516.457c-18.708-25.242-37.416-50.478-56.124-76.919-2.496-3.604-4.992-3.604-7.48 0l-18.709 28.846c-1.244 2.405-2.495 4.81-1.244 7.208v189.893h2.496l54.88-161.046c3.74 2.405 6.236 6.009 8.732 9.613 9.976 14.423 19.952 28.846 31.18 42.063 2.496 2.405 2.496 7.208 1.244 10.819-4.991 12.018-9.976 24.037-16.212 36.055-2.496 4.81-1.244 6.009 3.74 6.009h42.408c3.741 0 6.236 0 8.732 2.405 8.732 12.018 17.464 22.837 26.196 34.855-2.496 2.405-4.992 1.199-6.236 1.199H608.22c-9.976 0-9.976 1.199-14.968 9.613-8.732 18.028-2.495 14.424-22.448 14.424H494.72c-4.134 0-7.481-3.232-7.481-7.209v-55.287c0-3.984-3.353-7.208-7.48-7.208h-58.62c-6.236 0-8.732 1.199-8.732 8.414v52.882c0 4.648-3.909 8.414-8.732 8.414H372.48c-4.991 0-7.48-1.199-7.48-7.208V503.246c0-3.319 2.791-6.009 6.236-6.009h34.921c3.445 0 6.236 2.69 6.236 6.009v50.478c0 3.983 3.353 7.208 7.48 7.208h58.62c4.134 0 7.481-3.231 7.481-7.208V309.75c-.148-1.226-.359-4.214-.331-6.456.007-.732 2.201-.752 2.96-.752l.007-.007Z"
      />
    </g>
    <g filter="url(#g)">
      <path
        stroke="#D7B4FE"
        strokeMiterlimit={10}
        strokeWidth={7}
        d="M747.635 301.336h40.18c1.884-.041.991 5.203 1.244 7.208v156.243c0 5.609-3.325 8.414-9.976 8.414h-27.44c-4.992 1.199-9.977-1.199-12.472-6.009-21.204-28.846-43.653-57.686-64.857-86.532-1.244-1.199-1.244-3.604-4.991-3.604v105.765c-2.496-1.199-4.992-3.604-6.237-6.009l-36.171-49.279c-2.496-3.604-3.741-7.208-3.741-12.018v-43.269c0-3.604 1.245-7.208 3.741-10.819l38.667-55.288c3.741-6.009 4.992-6.009 9.977 0l62.36 79.324c1.245 2.405 3.74 4.81 7.481 6.009V309.75c.443-1.978-1.231-9.071 2.228-8.414h.007Z"
      />
    </g>
    <g filter="url(#h)">
      <path
        stroke="#D7B4FE"
        strokeMiterlimit={10}
        strokeWidth={7}
        d="M1177.99 301.336h47.35c2.01-.021 1.52 4.81 1.52 7.208v158.648c0 6.009-2.5 8.414-8.74 8.414h-31.18c-6.23 0-8.73-2.405-8.73-7.208v-51.677c0-9.613 0-10.819-9.98-10.819h-54.88c-5.82 0-8.73 3.204-8.73 9.613v51.677c0 6.408-3.32 9.613-9.97 9.613h-28.69c-5.82 0-8.73-2.805-8.73-8.414V309.75c0-2.405-.12-8.414 2.15-8.414h41.81c2.32.582 2.19 4.81 2.19 7.208v48.073c0 6.009 1.24 8.414 7.48 8.414h58.62c6.24 0 7.48-2.405 7.48-7.209V309.75c.14-2.866-.02-8.435 1.03-8.414Z"
      />
    </g>
    <g filter="url(#i)">
      <path
        stroke="#D7B4FE"
        strokeMiterlimit={10}
        strokeWidth={7}
        d="M1001.1 374.65h34.92c4.99 0 7.48 1.2 7.48 6.009v55.288c0 3.604-2.5 8.414-6.24 10.819-28.68 26.441-71.089 34.855-108.505 21.631-38.668-12.018-62.361-46.873-58.62-91.342 3.74-38.459 34.92-68.504 73.588-74.513 29.936-7.209 61.117 1.199 82.317 21.631 14.97 14.423 14.97 15.622-3.74 25.242-4.99 2.405-11.22 4.81-16.21 8.414s-6.236 2.405-8.731-1.199c-11.228-15.622-31.181-21.631-49.889-14.423-24.944 10.819-37.416 38.459-26.196 62.496 11.228 24.036 39.913 36.054 64.857 25.242 1.244 0 1.244-1.199 2.496-1.199l3.74-1.199c3.74-2.405 4.992-7.209 3.74-10.82-1.244-4.809-4.992-3.604-7.48-3.604h-24.945c-4.991 0-6.236-1.199-6.236-6.009v-26.441c0-4.81 2.496-7.208 7.481-7.208l36.173 1.199v-.014Z"
      />
    </g>
    <g filter="url(#j)">
      <path
        stroke="#D7B4FE"
        strokeMiterlimit={10}
        strokeWidth={7}
        d="M963.683 565.742c2.495 0 3.74-2.405 4.991-4.81 14.968-18.027 28.685-37.261 43.656-55.288 2.49-4.81 8.73-7.208 13.71-7.208h47.4c1.24 2.405 0 3.604-1.25 4.81-19.95 22.837-39.91 46.874-61.11 69.711-3.74 3.604-3.74 8.414-1.25 12.018 0 0 0 1.199 1.25 1.199 19.95 25.242 41.15 50.478 61.11 76.919l6.24 7.208c-2.5 2.405-6.24 1.199-8.73 1.199h-39.92c-4.99 1.199-9.97-2.405-12.47-6.009-12.47-16.828-24.943-33.649-36.171-50.478-1.244-2.405-2.495-4.81-6.236-6.009-8.732 4.81-13.716 14.424-12.472 25.243 1.245 10.819 0 21.631 0 31.251 0 4.81-1.244 7.208-6.236 7.208h-31.18c-9.976 0-8.732 0-8.732-8.414V508.049c0-6.009 1.244-8.414 7.48-7.208h32.432c6.236 0 7.481 1.199 7.481 7.208v52.883c-1.245 1.199-2.496 2.405 0 4.81h.007Z"
      />
    </g>
    <g filter="url(#k)">
      <path
        stroke="#D7B4FE"
        strokeMiterlimit={10}
        strokeWidth={7}
        d="M1154.51 672.706c-24.94 1.199-48.64-6.009-68.6-19.226-7.48-4.81-7.48-6.009-2.49-13.217 4.99-7.209 9.98-14.424 14.97-21.632 2.49-3.604 4.99-4.81 8.73-1.199 12.47 10.819 28.68 18.027 44.9 18.027 7.48 1.199 14.97 0 22.45-3.604 4.99-1.199 7.48-4.81 7.48-9.613s-3.74-7.208-7.48-9.613c-11.23-3.604-23.7-7.208-34.92-8.414-14.97-2.405-28.68-8.414-39.91-16.828-19.95-19.227-19.95-50.478 0-69.711 2.49-2.405 6.23-4.81 8.73-7.208 29.94-16.828 61.12-14.423 92.3-2.405 6.23 2.405 13.71 6.009 18.7 9.613 3.75 2.405 5 4.81 1.25 9.613-6.24 7.208-11.23 14.423-16.21 21.632-2.5 3.604-6.24 3.604-9.98 1.199-13.72-8.414-29.94-13.218-46.15-13.218-3.74 0-8.73 1.199-12.47 2.405-4.99 2.405-6.24 7.209-4.99 12.018 1.24 2.405 2.49 3.605 4.99 4.81 7.48 3.605 16.21 6.01 24.94 7.209 12.48 2.405 23.7 6.009 36.18 9.613 17.46 6.009 29.93 21.631 31.18 39.658 2.49 20.433-7.48 40.865-26.2 51.677-13.72 7.208-31.18 9.613-47.39 8.414h-.01Z"
      />
    </g>
    <g filter="url(#l)">
      <path
        stroke="#D7B4FE"
        strokeMiterlimit={10}
        strokeWidth={7}
        d="M823.986 672.706h-9.976c-7.48 0-13.716-3.604-17.464-9.613-19.952-27.64-39.912-55.288-59.864-81.729-3.741-4.81-4.992-10.819-2.496-15.622 9.976-38.46 36.172-57.686 74.832-64.901 33.677-7.208 68.597 7.208 87.305 36.055 4.992 7.208 4.992 8.414-3.74 12.018-8.732 3.604-16.212 7.208-24.944 12.018-2.496 2.405-6.236 1.199-7.481-1.199 0 0 0-1.199-1.244-1.199-9.976-16.828-31.18-25.242-49.888-18.027-18.709 6.009-32.432 22.837-32.432 42.063-2.496 25.242 16.212 48.073 42.408 50.478h6.236c13.716 0 26.196-7.209 32.432-18.028 3.74-4.81 6.236-6.009 12.472-3.604 6.236 2.405 14.968 7.209 22.448 10.819 7.481 3.611 8.732 4.81 3.74 12.019-14.968 26.441-43.652 39.658-72.344 38.459v-.007Z"
      />
    </g>
    <defs>
      <filter
        id="a"
        width={2606.96}
        height={2606.96}
        x={-1048.98}
        y={-821.98}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={13.095} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={26.19} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={91.665} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={183.33} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={314.28} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={549.99} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <filter
        id="c"
        width={462.611}
        height={488.496}
        x={1083.48}
        y={143.002}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={1.828} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={3.657} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={12.799} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={25.599} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={43.883} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={76.796} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <filter
        id="d"
        width={367.249}
        height={489.424}
        x={646.55}
        y={142.743}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={1.832} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={3.664} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={12.824} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={25.648} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={43.968} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={76.944} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <filter
        id="e"
        width={9.113}
        height={3.312}
        x={596.176}
        y={299.08}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={0.013} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={0.025} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={0.088} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={0.176} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={0.302} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={0.528} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <filter
        id="f"
        width={1145.81}
        height={1094.2}
        x={3.132}
        y={-60.539}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={4.266} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={8.533} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={29.864} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={59.728} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={102.391} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={179.184} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <filter
        id="g"
        width={492.781}
        height={510.488}
        x={459.726}
        y={137.845}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={1.904} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={3.808} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={13.329} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={26.658} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={45.699} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={79.974} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <filter
        id="h"
        width={485.897}
        height={491.689}
        x={899.119}
        y={143.226}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={1.841} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={3.681} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={12.884} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={25.768} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={44.174} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={77.305} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <filter
        id="i"
        width={488.379}
        height={489.193}
        x={712.435}
        y={142.686}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={1.831} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={3.662} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={12.818} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={25.636} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={43.947} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={76.907} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <filter
        id="j"
        width={477.616}
        height={488.376}
        x={759.182}
        y={341.383}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={1.828} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={3.656} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={12.796} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={25.592} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={43.872} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={76.776} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <filter
        id="k"
        width={463.143}
        height={489.155}
        x={922.644}
        y={341.146}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={1.831} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={3.662} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={12.817} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={25.634} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={43.943} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={76.901} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <filter
        id="l"
        width={480.063}
        height={487.032}
        x={576.259}
        y={342.38}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={1.823} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={3.646} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect1_dropShadow_0_1" result="effect2_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={12.76} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect2_dropShadow_0_1" result="effect3_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={25.521} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect3_dropShadow_0_1" result="effect4_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={43.75} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect4_dropShadow_0_1" result="effect5_dropShadow_0_1" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={76.562} />
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0" />
        <feBlend in2="effect5_dropShadow_0_1" result="effect6_dropShadow_0_1" />
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        />
      </filter>
      <clipPath id="b">
        <path fill="#fff" d="M51 278h407v407H51z" />
      </clipPath>
    </defs>
  </svg>
);
export default HeroSVG;
