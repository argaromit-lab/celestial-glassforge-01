const paths = {
  frost: '<path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13M11 6l5 5 5-5M11 26l5-5 5 5M4 15l7-2-2-7M28 17l-7 2 2 7M4 17l7 2-2 7M28 15l-7-2 2-7"/>',
  sun: '<circle cx="16" cy="16" r="6"/><path d="M16 2v5m0 18v5M2 16h5m18 0h5M6 6l4 4m12 12 4 4M26 6l-4 4M10 22l-4 4"/>',
  prism: '<path d="m16 3 12 12-12 14L4 15 16 3Zm0 0-5 12 5 14 5-14-5-12ZM4 15h24"/>',
  lung: '<path d="M16 3v12m0-4c-7-9-11-3-12 7s7 11 9 6l1-10m2-3c7-9 11-3 12 7s-7 11-9 6l-1-10M16 14l-5 5m5-5 5 5"/>',
  wind: '<path d="M3 10h18c8 0 7-9 1-7M3 16h23c6 0 6 7 1 8M6 22h9c7 0 6 8 1 7"/>',
  heart: '<path d="M16 28 5 17C-4 7 9-2 16 8 23-2 36 7 27 17L16 28Z"/><path d="m4 15 6-1 4 6 4-12 4 8 6-1"/>',
  chain: '<path d="m12 21-4 4a6 6 0 0 1-8-8l8-8a6 6 0 0 1 8 0m0 14a6 6 0 0 0 8 0l8-8a6 6 0 0 0-8-8l-4 4M10 22l12-12" transform="translate(1 -1) scale(.94)"/>',
  dash: '<path d="m5 16 10-12-2 10h13L16 28l3-12H5ZM2 9h5M0 23h9"/>',
  star: '<path d="m16 2 4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10Z"/><circle cx="16" cy="16" r="3"/>',
  flame: '<path d="M16 2c2 11 13 11 11 21C24 35 4 31 5 20c0-5 4-9 7-12-1 9 3 9 4 5 2-4 1-7 0-11Z"/><path d="M16 17c-8 9-3 14 2 11s3-7-2-11Z"/>',
  eye: '<path d="M2 16S7 6 16 6s14 10 14 10-5 10-14 10S2 16 2 16Z"/><circle cx="16" cy="16" r="5"/><path d="M16 1v3m0 24v3"/>',
  skull: '<path d="M8 22C-2 8 6 2 16 2s18 8 8 20v7H8v-7Z"/><path d="M11 25v4m5-4v4m5-4v4M8 12l5 2-1 5-5-2m17-5-5 2 1 5 5-2m-11 2 2-4 2 4"/>',
  anvil: '<path d="M2 8h28l-5 7h-5v8l5 5H7l5-5v-7H8L2 8Zm10 8h8M8 3h13v5"/>',
  trophy: '<path d="M9 3h14v10c0 10-14 10-14 0V3ZM9 6H3v5c0 5 6 5 8 5m12-10h6v5c0 5-6 5-8 5M16 21v7m-7 2h14"/>',
  sound: '<path d="m4 13 6 0 8-8v22l-8-8H4v-6Zm18-4c5 3 5 11 0 14m4-18c8 5 8 17 0 22"/>',
  pause: '<path d="M10 5v22M22 5v22" stroke-width="4"/>',
};
export function icon(name, className = '', color = '') {
  return `<svg class="icon ${className}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${color ? ` style="color:${color}"` : ''}>${paths[name] || paths.prism}</svg>`;
}
