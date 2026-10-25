export const THEME = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap');
:root{
  --bone:#F6F2E8;      /* fondo principal (soft cream) */
  --paper:#E9DEC8;     /* cards / secciones (warm oat) */
  --ash:#CBB089;       /* bordes / detalles (caramel beige) */
  --cacao:#4A352A;     /* texto principal / titulos (walnut) */
  --muted:#7A6658;     /* texto secundario */
  --amber:#8D4A27;     /* acento primario (cinnamon) */
  --sage:#CBB089;      /* acento secundario (caramel) */
}
html{scroll-behavior:smooth}
.font-display{font-family:'Cormorant Garamond',Georgia,serif}
.font-body{font-family:'Jost',system-ui,sans-serif}
@keyframes flicker{
  0%,100%{transform:scale(1,1) rotate(-1deg);opacity:.95}
  30%{transform:scale(.94,1.06) rotate(1.5deg);opacity:1}
  60%{transform:scale(1.04,.96) rotate(-1.5deg);opacity:.9}
}
.flame{transform-origin:50% 100%;animation:flicker 2.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.flame{animation:none}}
`;