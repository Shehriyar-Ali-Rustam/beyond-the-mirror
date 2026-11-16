/* Keyframes for the little living details of the room. Scoped with a cz- prefix. */

const CSS = `
.cz-twinkle { animation: cz-tw 3.6s ease-in-out infinite; }
@keyframes cz-tw { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
.cz-twinkle-soft { animation: cz-tws 3.2s ease-in-out infinite; }
@keyframes cz-tws { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
.cz-blink-slow { animation: cz-bl 2.6s ease-in-out infinite; }
@keyframes cz-bl { 0%, 100% { opacity: 0.25; } 45%, 55% { opacity: 1; } }
.cz-firefly { animation: cz-ff 5s ease-in-out infinite; }
@keyframes cz-ff { 0%, 100% { opacity: 0; transform: translate(0, 0); } 30% { opacity: 0.9; } 50% { opacity: 0.4; transform: translate(10px, -14px); } 70% { opacity: 0.9; } }
.cz-shimmer { animation: cz-sh 3.4s ease-in-out infinite; }
@keyframes cz-sh { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.cz-waves { animation: cz-wv 9s ease-in-out infinite alternate; }
@keyframes cz-wv { from { transform: translateX(-14px); } to { transform: translateX(14px); } }
.cz-beam { animation: cz-bm 9s ease-in-out infinite; }
@keyframes cz-bm { 0%, 100% { transform: scaleX(1); opacity: 1; } 45%, 55% { transform: scaleX(-1); } 25%, 75% { opacity: 0.35; } }
.cz-smoke { animation: cz-sm 5s ease-out infinite; }
@keyframes cz-sm { from { transform: translate(0, 0) scale(0.7); opacity: 0.5; } to { transform: translate(8px, -30px) scale(1.8); opacity: 0; } }
.cz-flame { animation: cz-fl 1.1s ease-in-out infinite alternate; }
@keyframes cz-fl { 0% { transform: scale(1, 1) skewX(0deg); } 35% { transform: scale(0.94, 1.06) skewX(3deg); } 70% { transform: scale(1.04, 0.95) skewX(-2deg); } 100% { transform: scale(0.97, 1.03) skewX(1deg); } }
.cz-flicker { animation: cz-fk 2.2s ease-in-out infinite; }
@keyframes cz-fk { 0%, 100% { opacity: 1; } 30% { opacity: 0.86; } 55% { opacity: 0.97; } 80% { opacity: 0.88; } }
.cz-sway { animation: cz-sw 7s ease-in-out infinite; }
@keyframes cz-sw { 0%, 100% { transform: rotate(-1.4deg); } 50% { transform: rotate(1.4deg); } }
.cz-breathe { animation: cz-br 4.4s ease-in-out infinite; }
@keyframes cz-br { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.025, 1.04); } }
.cz-purr { animation: cz-pr 0.9s ease-in-out infinite; }
@keyframes cz-pr { 0%, 100% { transform: scale(1) translateY(0); } 50% { transform: scale(1.035, 1.05) translateY(-0.6px); } }
.cz-rustle { animation: cz-ru 1s ease-in-out 1; }
@keyframes cz-ru { 0%, 100% { transform: rotate(0deg); } 20% { transform: rotate(-2.5deg); } 45% { transform: rotate(2deg); } 70% { transform: rotate(-1deg); } }
.cz-noscroll { scrollbar-width: none; }
.cz-noscroll::-webkit-scrollbar { display: none; }
.cz-range { accent-color: var(--primary); }
`;

export function CozyStyles() {
  return <style>{CSS}</style>;
}
