const trazos = {
  inicio: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v12h14V9M9 21v-8h6v8" />
    </>
  ),
  vender: (
    <>
      <path d="M3 3h2l3 12h11l3-9H6" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </>
  ),
  inventario: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
    </>
  ),
  fiados: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M7 11h10M7 15h6M7 18h4" />
    </>
  ),
  caja: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 10h18M7 15h3M15 15h2" />
    </>
  ),
  reportes: (
    <>
      <path d="M4 3v18h17M8 17v-5M13 17V8M18 17V4" />
    </>
  ),
  config: (
    <>
      <path d="m9 3-.7 2.3-2 .9L4 5.7 2.5 8.3l1.7 1.8v2.3l-1.7 1.8L4 17l2.3-.5 2 .9L9 20h3l.7-2.6 2-.9 2.3.5 1.5-2.8-1.7-1.8v-2.3l1.7-1.8L17 5.7l-2.3.5-2-.9L12 3Z" />
      <circle cx="10.5" cy="11.5" r="3" />
    </>
  ),
};

export default function Icono({ nombre }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {trazos[nombre]}
    </svg>
  );
}
