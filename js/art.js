/* PressCraft artwork: clip art, borders and Screen Magic patterns.
   Everything here is original artwork drawn for PressCraft (simple shapes in the spirit of 1980s clip art).
   Clip art is SVG on a 100 × 100 grid; borders and patterns are generated as SVG for any size. */
(function () {
  'use strict';
  const INK = '#222222';
  const C = { red: '#e8483f', blue: '#3f8be8', yellow: '#f5c518', orange: '#f59a23', green: '#2e9b4f', purple: '#7b4fd6', pink: '#f7b6c8',
    cream: '#fff4e0', brown: '#8b5a2b', sky: '#b9dcf7', grey: '#9aa1ad', tan: '#f7d9a8', white: '#ffffff' };
  const svg = (inner, sw = 3) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
  const ring = (n, f) => Array.from({ length: n }, (_, i) => f(i, (i * 360) / n)).join('');
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (cx, cy, r, d) => [+(cx + r * Math.sin(rad(d))).toFixed(2), +(cy - r * Math.cos(rad(d))).toFixed(2)];

  // ------------------------------------------------------------------ clip art
  const ART = [
    // Celebrations
    ['balloons', 'Balloons', 'Celebrations', `<path d="M32 58Q28 76 42 94M50 50Q56 74 46 94M68 60Q66 78 50 94" fill="none"/><ellipse cx="32" cy="36" rx="16" ry="20" fill="${C.red}"/><ellipse cx="68" cy="40" rx="16" ry="20" fill="${C.blue}"/><ellipse cx="50" cy="28" rx="16" ry="20" fill="${C.yellow}"/><path d="M29 56l3 5 3-5zM65 60l3 5 3-5zM47 48l3 5 3-5z" fill="${INK}"/>`],
    ['cake', 'Birthday cake', 'Celebrations', `<path d="M12 88h76"/><rect x="18" y="58" width="64" height="30" rx="4" fill="${C.pink}"/><rect x="26" y="42" width="48" height="18" rx="3" fill="${C.cream}"/><path d="M18 68q8 6 16 0t16 0 16 0 16 0" fill="none"/><path d="M38 42V30M50 42V28M62 42V30" fill="none"/><path d="M38 22q-4 4 0 7 4-3 0-7zM50 20q-4 4 0 7 4-3 0-7zM62 22q-4 4 0 7 4-3 0-7z" fill="${C.orange}"/>`],
    ['gift', 'Present', 'Celebrations', `<rect x="18" y="44" width="64" height="44" fill="${C.red}"/><rect x="14" y="32" width="72" height="14" fill="${C.red}"/><rect x="45" y="32" width="10" height="56" fill="${C.yellow}"/><path d="M50 32c-10-14-26-10-18-2 4 4 18 2 18 2zM50 32c10-14 26-10 18-2-4 4-18 2-18 2z" fill="${C.yellow}"/>`],
    ['partyhat', 'Party hat', 'Celebrations', `<path d="M50 12 78 86H22Z" fill="${C.purple}"/><path d="M38 50h24M31 68h38" stroke="${C.yellow}" stroke-width="6"/><circle cx="50" cy="11" r="7" fill="${C.yellow}"/>`],
    ['candle', 'Candle', 'Celebrations', `<path d="M28 88h44"/><rect x="40" y="38" width="20" height="50" rx="2" fill="${C.cream}"/><path d="M50 38v-8" fill="none"/><path d="M50 8c-8 10-8 18 0 21 8-3 8-11 0-21z" fill="${C.orange}"/><path d="M44 38v8a3 3 0 0 0 6 0" fill="none"/>`],
    ['confetti', 'Confetti', 'Celebrations', ring(14, (i, d) => { const [x, y] = pt(50, 50, 18 + (i % 3) * 13, d * 1.7); const col = [C.red, C.blue, C.yellow, C.green, C.purple][i % 5]; return i % 2 ? `<circle cx="${x}" cy="${y}" r="4" fill="${col}"/>` : `<rect x="${x - 4}" y="${y - 2}" width="8" height="4" transform="rotate(${d} ${x} ${y})" fill="${col}"/>`; })],
    ['fireworks', 'Fireworks', 'Celebrations', ring(16, (i, d) => { const [x1, y1] = pt(50, 46, 10, d), [x2, y2] = pt(50, 46, i % 2 ? 40 : 30, d); return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${[C.red, C.yellow, C.blue, C.green][i % 4]}" stroke-width="4"/>`; }) + `<circle cx="50" cy="46" r="5" fill="${C.yellow}"/>`],
    ['crown', 'Crown', 'Celebrations', `<path d="M14 76 18 30l18 20 14-30 14 30 18-20 4 46Z" fill="${C.yellow}"/><path d="M14 76h72v10H14z" fill="${C.yellow}"/><circle cx="36" cy="64" r="4" fill="${C.red}"/><circle cx="50" cy="62" r="5" fill="${C.blue}"/><circle cx="64" cy="64" r="4" fill="${C.green}"/>`],
    // Holidays
    ['heart', 'Heart', 'Holidays', `<path d="M50 88C20 66 8 50 12 33c4-16 24-21 38-4 14-17 34-12 38 4 4 17-8 33-38 55z" fill="${C.red}"/>`],
    ['star', 'Star', 'Holidays', `<path d="M50 8l12 26 28 3-21 19 6 28-25-14-25 14 6-28-21-19 28-3z" fill="${C.yellow}"/>`],
    ['tree', 'Holiday tree', 'Holidays', `<path d="M50 8 74 40H62l18 24H64l18 20H18l18-20H20l18-24H26Z" fill="${C.green}"/><rect x="44" y="84" width="12" height="10" fill="${C.brown}"/><circle cx="40" cy="56" r="3.5" fill="${C.red}"/><circle cx="60" cy="72" r="3.5" fill="${C.yellow}"/><circle cx="55" cy="40" r="3.5" fill="${C.blue}"/><circle cx="38" cy="76" r="3.5" fill="${C.blue}"/>`],
    ['bell', 'Bell', 'Holidays', `<path d="M50 16c-16 0-24 12-24 28v16l-8 10h64l-8-10V44c0-16-8-28-24-28z" fill="${C.yellow}"/><circle cx="50" cy="78" r="7" fill="${C.yellow}"/><path d="M50 16V9" fill="none"/><path d="M40 70h20" fill="none"/>`],
    ['pumpkin', 'Pumpkin', 'Holidays', `<ellipse cx="50" cy="60" rx="38" ry="28" fill="${C.orange}"/><path d="M50 32c-12 0-16 56 0 56M50 32c12 0 16 56 0 56M30 36c-10 8-10 40 0 48M70 36c10 8 10 40 0 48" fill="none"/><path d="M50 32c0-8 4-14 10-17" stroke="${C.green}" stroke-width="6" fill="none"/>`],
    ['shamrock', 'Shamrock', 'Holidays', `<path d="M50 58q4 20 16 32" fill="none" stroke="${C.green}" stroke-width="6"/><circle cx="50" cy="32" r="16" fill="${C.green}"/><circle cx="32" cy="52" r="16" fill="${C.green}"/><circle cx="68" cy="52" r="16" fill="${C.green}"/>`],
    ['egg', 'Decorated egg', 'Holidays', `<ellipse cx="50" cy="54" rx="29" ry="37" fill="${C.sky}"/><path d="M23 46l9-6 9 6 9-6 9 6 9-6 9 6" fill="none" stroke="${C.red}"/><path d="M22 60h56" stroke="${C.yellow}" stroke-width="6"/><path d="M24 70l6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4" fill="none" stroke="${C.purple}"/>`],
    ['snowflake', 'Snowflake', 'Holidays', ring(6, (i, d) => { const [x, y] = pt(50, 50, 40, d), [a, b] = pt(50, 50, 26, d), [l1, l2] = pt(a, b, 10, d - 45), [r1, r2] = pt(a, b, 10, d + 45); return `<path d="M50 50L${x} ${y}M${a} ${b}L${l1} ${l2}M${a} ${b}L${r1} ${r2}" fill="none" stroke="${C.blue}" stroke-width="5"/>`; })],
    ['pennant', 'Flag', 'Holidays', `<path d="M22 8v86" stroke-width="5"/><path d="M22 12h58l-12 17 12 17H22z" fill="${C.red}"/>`],
    ['candycane', 'Candy cane', 'Holidays', `<path d="M40 90V34a14 14 0 0 1 28 0v6" fill="none" stroke="${INK}" stroke-width="16"/><path d="M40 90V34a14 14 0 0 1 28 0v6" fill="none" stroke="${C.white}" stroke-width="10"/><path d="M40 84v-8M40 66v-8M40 48v-8M46 24l6 6M62 24l-4 7" stroke="${C.red}" stroke-width="8" stroke-linecap="butt"/>`, 3],
    // Nature
    ['sun', 'Sun', 'Nature', ring(12, (i, d) => { const [x1, y1] = pt(50, 50, 28, d), [x2, y2] = pt(50, 50, 44, d); return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${C.orange}" stroke-width="5"/>`; }) + `<circle cx="50" cy="50" r="22" fill="${C.yellow}"/>`],
    ['moon', 'Moon and stars', 'Nature', `<path d="M60 14a36 36 0 1 0 28 54A30 30 0 0 1 60 14z" fill="${C.yellow}"/><path d="M24 18l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1zM80 30l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="${C.yellow}"/>`],
    ['flower', 'Flower', 'Nature', `<path d="M50 56v38" fill="none" stroke="${C.green}" stroke-width="5"/><path d="M50 80c10-12 24-12 28-8-8 10-20 10-28 8z" fill="${C.green}"/>` + ring(6, (i, d) => { const [x, y] = pt(50, 34, 16, d); return `<ellipse cx="${x}" cy="${y}" rx="9" ry="14" transform="rotate(${d} ${x} ${y})" fill="${C.pink}"/>`; }) + `<circle cx="50" cy="34" r="9" fill="${C.yellow}"/>`],
    ['oak', 'Tree', 'Nature', `<rect x="44" y="58" width="12" height="34" fill="${C.brown}"/><path d="M30 64a16 16 0 0 1-4-30 22 22 0 0 1 42-10 18 18 0 0 1 8 34 14 14 0 0 1-18 8 16 16 0 0 1-28-2z" fill="${C.green}"/>`],
    ['leaf', 'Leaf', 'Nature', `<path d="M18 82C18 42 48 16 86 14 84 52 58 82 18 82z" fill="${C.orange}"/><path d="M18 82 70 30M40 60h16M52 48h14M36 64V50" fill="none"/>`],
    ['rain', 'Rain cloud', 'Nature', `<path d="M28 62a15 15 0 0 1 1-30 21 21 0 0 1 40-4 17 17 0 0 1 4 34z" fill="#e6eef7"/><path d="M34 72l-4 10M50 72l-4 10M66 72l-4 10" stroke="${C.blue}" stroke-width="5"/>`],
    ['butterfly', 'Butterfly', 'Nature', `<ellipse cx="32" cy="36" rx="17" ry="21" transform="rotate(-28 32 36)" fill="${C.purple}"/><ellipse cx="68" cy="36" rx="17" ry="21" transform="rotate(28 68 36)" fill="${C.purple}"/><ellipse cx="34" cy="68" rx="12" ry="15" transform="rotate(30 34 68)" fill="${C.pink}"/><ellipse cx="66" cy="68" rx="12" ry="15" transform="rotate(-30 66 68)" fill="${C.pink}"/><rect x="46" y="28" width="8" height="52" rx="4" fill="${INK}"/><path d="M48 28q-6-14-14-16M52 28q6-14 14-16" fill="none"/>`],
    ['bird', 'Bird', 'Nature', `<path d="M14 58c10-20 34-25 46-13l18-6-8 12c6 22-20 36-44 28z" fill="${C.blue}"/><path d="M76 42l13 2-11 7z" fill="${C.orange}"/><circle cx="64" cy="49" r="3" fill="${INK}"/><path d="M30 60c8 0 16-6 18-14" fill="none"/>`],
    ['cactus', 'Cactus', 'Nature', `<path d="M42 90V24a8 8 0 0 1 16 0v66M42 60H32a8 8 0 0 1-8-8V40a5 5 0 0 1 10 0v10h8M58 50h8V36a5 5 0 0 1 10 0v12a8 8 0 0 1-8 8H58" fill="${C.green}"/><path d="M30 90h40" stroke-width="5"/>`],
    ['mountain', 'Mountains', 'Nature', `<path d="M6 86 36 34l18 28 12-18 28 42Z" fill="${C.grey}"/><path d="M36 34l-8 14 8-4 6 6zM66 44l-6 8 6-2 5 4z" fill="${C.white}"/><circle cx="78" cy="22" r="8" fill="${C.yellow}"/>`],
    // Animals
    ['cat', 'Cat', 'Animals', `<path d="M24 34 22 10l18 14h20l18-14-2 24c6 8 8 16 6 24-4 18-18 28-32 28S22 76 18 58c-2-8 0-16 6-24z" fill="${C.orange}"/><ellipse cx="38" cy="48" rx="4" ry="6" fill="${INK}"/><ellipse cx="62" cy="48" rx="4" ry="6" fill="${INK}"/><path d="M46 60h8l-4 5z" fill="${C.pink}"/><path d="M50 65v4M50 69q-6 5-10 1M50 69q6 5 10 1M20 58l16 2M20 66l16-2M80 58l-16 2M80 66l-16-2" fill="none"/>`],
    ['dog', 'Dog', 'Animals', `<path d="M26 30c-14 2-18 30-8 38l10-6z" fill="${C.brown}"/><path d="M74 30c14 2 18 30 8 38l-10-6z" fill="${C.brown}"/><ellipse cx="50" cy="52" rx="26" ry="32" fill="${C.tan}"/><ellipse cx="50" cy="68" rx="14" ry="11" fill="${C.cream}"/><ellipse cx="50" cy="62" rx="6" ry="4.5" fill="${INK}"/><circle cx="39" cy="46" r="4" fill="${INK}"/><circle cx="61" cy="46" r="4" fill="${INK}"/><path d="M50 66v5q-6 6-10 2M50 71q6 6 10 2" fill="none"/>`],
    ['fish', 'Fish', 'Animals', `<path d="M78 50l14-16v32z" fill="${C.orange}"/><path d="M12 50c16-26 52-26 66 0-14 26-50 26-66 0z" fill="${C.orange}"/><circle cx="30" cy="46" r="4" fill="${INK}"/><path d="M48 34q6 16 0 32M58 36q6 14 0 28" fill="none"/>`],
    ['owl', 'Owl', 'Animals', `<path d="M24 20l10 10h32l10-10v52c0 12-12 22-26 22S24 84 24 72z" fill="${C.brown}"/><circle cx="38" cy="42" r="11" fill="${C.cream}"/><circle cx="62" cy="42" r="11" fill="${C.cream}"/><circle cx="38" cy="42" r="4.5" fill="${INK}"/><circle cx="62" cy="42" r="4.5" fill="${INK}"/><path d="M46 52h8l-4 8z" fill="${C.orange}"/><path d="M36 70l4 4 4-4 4 4 4-4 4 4 4-4 4 4" fill="none"/>`],
    ['turtle', 'Turtle', 'Animals', `<ellipse cx="80" cy="60" rx="10" ry="8" fill="${C.green}"/><path d="M26 74l-6 10M44 76l-2 10M60 76l2 10M74 72l6 10" stroke-width="7"/><path d="M14 72c0-26 18-40 36-40s36 14 36 40z" fill="${C.green}"/><path d="M28 72l8-18h28l8 18M36 54l14-14 14 14" fill="none"/><circle cx="84" cy="58" r="2" fill="${INK}"/>`],
    ['paw', 'Paw print', 'Animals', `<ellipse cx="50" cy="66" rx="20" ry="17" fill="${C.brown}"/><ellipse cx="24" cy="42" rx="8" ry="11" fill="${C.brown}"/><ellipse cx="40" cy="26" rx="8" ry="11" fill="${C.brown}"/><ellipse cx="60" cy="26" rx="8" ry="11" fill="${C.brown}"/><ellipse cx="76" cy="42" rx="8" ry="11" fill="${C.brown}"/>`],
    // Home and school
    ['house', 'House', 'Home and school', `<rect x="22" y="46" width="56" height="44" fill="${C.tan}"/><path d="M12 50 50 14l38 36Z" fill="${C.red}"/><rect x="42" y="64" width="16" height="26" fill="${C.brown}"/><rect x="28" y="56" width="10" height="10" fill="${C.sky}"/><rect x="62" y="56" width="10" height="10" fill="${C.sky}"/><rect x="66" y="20" width="8" height="16" fill="${C.brown}"/>`],
    ['apple', 'Apple', 'Home and school', `<path d="M50 32c-10-8-34-6-34 22 0 22 18 38 34 30 16 8 34-8 34-30 0-28-24-30-34-22z" fill="${C.red}"/><path d="M50 32c0-8 2-14 8-18" fill="none"/><path d="M55 24c8-10 20-8 22-4-6 8-16 8-22 4z" fill="${C.green}"/>`],
    ['book', 'Book', 'Home and school', `<path d="M50 28C40 20 22 20 10 24v56c12-4 30-4 40 4 10-8 28-8 40-4V24c-12-4-30-4-40 4z" fill="${C.cream}"/><path d="M50 28v56M18 36q12-3 24 2M18 48q12-3 24 2M18 60q12-3 24 2M58 38q12-5 24-2M58 50q12-5 24-2M58 62q12-5 24-2" fill="none"/>`],
    ['pencil', 'Pencil', 'Home and school', `<path d="M22 78 68 32l12 12-46 46-15 3z" fill="${C.yellow}"/><path d="M68 32l7-7a4 4 0 0 1 6 0l6 6a4 4 0 0 1 0 6l-7 7z" fill="${C.pink}"/><path d="M22 78l12 12-15 3z" fill="${C.cream}"/><path d="M19 93l2-6 4 4z" fill="${INK}"/><path d="M28 72l46-46" fill="none"/>`],
    ['computer', 'Home computer', 'Home and school', `<rect x="16" y="12" width="68" height="50" rx="5" fill="${C.cream}"/><rect x="24" y="19" width="52" height="34" fill="#1d4d2a"/><path d="M30 28h14M30 36h24M30 44h8" stroke="#7CFC8A" stroke-width="3"/><rect x="8" y="70" width="84" height="18" rx="3" fill="${C.cream}"/><path d="M16 76h68M16 82h68M24 70v18M36 70v18M48 70v18M60 70v18M72 70v18" fill="none" stroke-width="1.5"/><path d="M40 62h20l4 8H36z" fill="${C.cream}"/>`],
    ['phone', 'Telephone', 'Home and school', `<path d="M14 34c0-14 72-14 72 0v6H64v-6H36v6H14z" fill="${C.red}"/><path d="M28 44h44l12 42H16z" fill="${C.red}"/><circle cx="50" cy="66" r="13" fill="${C.cream}"/>` + ring(8, (i, d) => { const [x, y] = pt(50, 66, 8, d); return `<circle cx="${x}" cy="${y}" r="2" fill="${INK}" stroke="none"/>`; })],
    ['coffee', 'Coffee cup', 'Home and school', `<path d="M16 88h62"/><path d="M22 38h48v26a20 20 0 0 1-20 20h-8a20 20 0 0 1-20-20z" fill="${C.cream}"/><path d="M70 46h6a10 10 0 0 1 0 20h-6" fill="none"/><path d="M36 28c-4-6 4-8 0-14M50 28c-4-6 4-8 0-14" fill="none"/>`],
    ['clock', 'Clock', 'Home and school', `<circle cx="50" cy="52" r="38" fill="${C.cream}"/>` + ring(12, (i, d) => { const [x1, y1] = pt(50, 52, 31, d), [x2, y2] = pt(50, 52, 35, d); return `<path d="M${x1} ${y1}L${x2} ${y2}"/>`; }) + `<path d="M50 52V28M50 52l16 8" fill="none" stroke-width="4"/><circle cx="50" cy="52" r="3" fill="${INK}"/>`],
    ['lightbulb', 'Light bulb', 'Home and school', `<path d="M50 10a26 26 0 0 0-15 47c4 3 5 7 5 11h20c0-4 1-8 5-11a26 26 0 0 0-15-47z" fill="${C.yellow}"/><path d="M40 70h20v6H40zM40 76h20v6H40z" fill="${C.grey}"/><path d="M45 88h10M44 44l6 8 6-8M50 52v16" fill="none"/>`],
    ['gradcap', 'Graduation cap', 'Home and school', `<path d="M26 50v18c0 6 48 6 48 0V50" fill="${INK}"/><path d="M50 24 92 42 50 60 8 42z" fill="${INK}"/><path d="M50 42l26 10v20" fill="none" stroke="${C.yellow}" stroke-width="3"/><circle cx="76" cy="76" r="4" fill="${C.yellow}" stroke="none"/>`],
    // Fun and sport
    ['ball', 'Beach ball', 'Fun and sport', `<circle cx="50" cy="50" r="40" fill="${C.white}"/><path d="M50 10C30 30 30 70 50 90A40 40 0 0 1 50 10z" fill="${C.red}"/><path d="M50 10c20 20 20 60 0 80a40 40 0 0 0 0-80z" fill="${C.blue}"/><path d="M50 10c8 20 8 60 0 80" fill="none"/><circle cx="50" cy="50" r="40" fill="none"/>`],
    ['trophy', 'Trophy', 'Fun and sport', `<path d="M30 14h40v22c0 14-9 24-20 24s-20-10-20-24z" fill="${C.yellow}"/><path d="M30 20H18c0 14 6 20 14 22M70 20h12c0 14-6 20-14 22" fill="none"/><path d="M44 60h12v12H44z" fill="${C.yellow}"/><path d="M30 72h40v14H30z" fill="${C.brown}"/>`],
    ['music', 'Music notes', 'Fun and sport', `<path d="M38 76V26l40-8v50" fill="none" stroke-width="5"/><path d="M38 34l40-8" stroke-width="9"/><ellipse cx="29" cy="77" rx="11" ry="8.5" fill="${INK}"/><ellipse cx="69" cy="68" rx="11" ry="8.5" fill="${INK}"/>`],
    ['camera', 'Camera', 'Fun and sport', `<rect x="10" y="30" width="80" height="54" rx="6" fill="${C.grey}"/><path d="M34 30l6-10h20l6 10" fill="${C.grey}"/><circle cx="50" cy="57" r="17" fill="${C.cream}"/><circle cx="50" cy="57" r="9" fill="${INK}"/><rect x="70" y="36" width="12" height="7" fill="${C.yellow}"/>`],
    ['rocket', 'Rocket', 'Fun and sport', `<path d="M42 78h16l-8 16z" fill="${C.orange}"/><path d="M50 6c16 14 18 40 12 72H38C32 46 34 20 50 6z" fill="${C.cream}"/><circle cx="50" cy="36" r="8" fill="${C.sky}"/><path d="M38 56 24 72l2 8 12-4zM62 56l14 16-2 8-12-4z" fill="${C.red}"/>`],
    ['car', 'Car', 'Fun and sport', `<path d="M8 66V54l10-4 12-16h34l14 16 12 4v12z" fill="${C.blue}"/><path d="M34 38h12v12H24zM52 38h10l10 12H52z" fill="${C.sky}"/><circle cx="28" cy="68" r="10" fill="${INK}"/><circle cx="72" cy="68" r="10" fill="${INK}"/><circle cx="28" cy="68" r="4" fill="${C.grey}"/><circle cx="72" cy="68" r="4" fill="${C.grey}"/>`],
    ['bike', 'Bicycle', 'Fun and sport', `<circle cx="24" cy="64" r="18" fill="none"/><circle cx="76" cy="64" r="18" fill="none"/><path d="M24 64 40 36h28L76 64M40 36l12 28 16-28M52 64H24M36 28h10M68 36l-2-10h8" fill="none" stroke="${C.red}" stroke-width="4"/>`],
    ['icecream', 'Ice cream', 'Fun and sport', `<path d="M30 50h40L50 94z" fill="${C.tan}"/><path d="M36 58l20 20M44 52l18 18M56 52 38 70M64 56 44 76" fill="none" stroke-width="2"/><circle cx="38" cy="42" r="13" fill="${C.pink}"/><circle cx="62" cy="42" r="13" fill="${C.cream}"/><circle cx="50" cy="28" r="13" fill="${C.brown}"/><circle cx="50" cy="13" r="4" fill="${C.red}"/>`],
    ['smile', 'Smiley face', 'Fun and sport', `<circle cx="50" cy="50" r="40" fill="${C.yellow}"/><ellipse cx="36" cy="40" rx="5" ry="7" fill="${INK}"/><ellipse cx="64" cy="40" rx="5" ry="7" fill="${INK}"/><path d="M28 58c8 18 36 18 44 0" fill="none" stroke-width="4"/>`],
    ['dice', 'Dice', 'Fun and sport', `<rect x="14" y="14" width="72" height="72" rx="12" fill="${C.white}"/><circle cx="32" cy="32" r="6" fill="${INK}"/><circle cx="50" cy="50" r="6" fill="${INK}"/><circle cx="68" cy="68" r="6" fill="${INK}"/><circle cx="68" cy="32" r="6" fill="${INK}"/><circle cx="32" cy="68" r="6" fill="${INK}"/>`],
    // Signs and symbols
    ['arrow', 'Arrow', 'Signs and symbols', `<path d="M8 38h50V20l34 30-34 30V62H8z" fill="${C.blue}"/>`],
    ['check', 'Check mark', 'Signs and symbols', `<circle cx="50" cy="50" r="40" fill="${C.green}"/><path d="M30 52l14 14 26-30" fill="none" stroke="${C.white}" stroke-width="9"/>`],
    ['warning', 'Warning', 'Signs and symbols', `<path d="M50 10 92 86H8z" fill="${C.yellow}"/><path d="M50 36v26" stroke-width="8"/><circle cx="50" cy="74" r="5" fill="${INK}"/>`],
    ['tag', 'Sale tag', 'Signs and symbols', `<path d="M48 10h38v38L44 90 6 52z" fill="${C.red}"/><circle cx="72" cy="24" r="6" fill="${C.white}"/><path d="M30 52l20 20M38 44l20 20" stroke="${C.white}" stroke-width="5"/>`],
    ['coin', 'Money', 'Signs and symbols', `<circle cx="50" cy="50" r="40" fill="${C.yellow}"/><circle cx="50" cy="50" r="31" fill="none" stroke-width="2"/><path d="M62 36c-4-6-24-8-24 4 0 12 26 6 26 18 0 12-22 10-27 3M50 24v52" fill="none" stroke-width="5"/>`],
    ['megaphone', 'Announcement', 'Signs and symbols', `<path d="M14 40h14l44-22v64L28 60H14z" fill="${C.red}"/><path d="M28 60l6 24h10l-4-24" fill="${C.grey}"/><path d="M80 36q8 14 0 28M86 28q14 22 0 44" fill="none"/>`],
    ['peace', 'Peace', 'Signs and symbols', `<circle cx="50" cy="50" r="38" fill="${C.sky}" stroke-width="7"/><path d="M50 12v76M50 50 23 77M50 50l27 27" fill="none" stroke-width="7"/>`],
    ['hand', 'Thumbs up', 'Signs and symbols', `<path d="M30 46h10l10-26c4-8 14-6 12 4l-4 18h22c6 0 10 6 8 12l-6 24c-2 6-6 8-12 8H40V46" fill="${C.tan}"/><rect x="14" y="44" width="18" height="44" rx="3" fill="${C.blue}"/>`],
  ];
  const ART_BY_ID = Object.fromEntries(ART.map(([id, name, cat, inner, sw]) => [id, { id, name, cat, svg: svg(inner, sw) }]));

  // Recolour clip art: 'color' (as drawn), 'outline' (black lines, white fills, like a colouring page),
  // 'mono' (lines in one colour, fills in a light shade of it).
  const blend = (hex, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k + 255 * (1 - k)).toString(16).padStart(2, '0')).join('');
  function clipSvg(id, mode = 'color', tint = '#222222') {
    const a = ART_BY_ID[id]; if (!a) return '';
    if (mode === 'color') return a.svg;
    return a.svg.replace(/(fill|stroke)="(#[0-9a-fA-F]{6})"/g, (m, attr, c) => {
      c = c.toLowerCase();
      if (mode === 'outline') return attr === 'fill' ? (c === INK ? m : 'fill="#ffffff"') : `stroke="${INK}"`;
      if (c === '#ffffff') return m;
      return attr === 'stroke' || c === INK ? `${attr}="${tint}"` : `fill="${blend(tint, 0.35)}"`;
    });
  }

  // ------------------------------------------------------------------ borders
  // A border is drawn inside a w × h box (in px), inset by `inset`, `size` is the band width.
  const MOTIF = {
    star: (s) => `<path d="M0 ${-s}L${s * 0.29} ${-s * 0.4} ${s * 0.95} ${-s * 0.31} ${s * 0.47} ${s * 0.15} ${s * 0.59} ${s * 0.81} 0 ${s * 0.5} ${-s * 0.59} ${s * 0.81} ${-s * 0.47} ${s * 0.15} ${-s * 0.95} ${-s * 0.31} ${-s * 0.29} ${-s * 0.4}Z"/>`,
    heart: (s) => `<path d="M0 ${s * 0.9}C${-s} ${s * 0.2} ${-s * 1.1} ${-s * 0.5} ${-s * 0.55} ${-s * 0.8} ${-s * 0.25} ${-s * 0.95} 0 ${-s * 0.7} 0 ${-s * 0.5} 0 ${-s * 0.7} ${s * 0.25} ${-s * 0.95} ${s * 0.55} ${-s * 0.8} ${s * 1.1} ${-s * 0.5} ${s} ${s * 0.2} 0 ${s * 0.9}Z"/>`,
    diamond: (s) => `<path d="M0 ${-s}L${s * 0.7} 0 0 ${s} ${-s * 0.7} 0Z"/>`,
    dot: (s) => `<circle r="${s * 0.55}"/>`,
    flower: (s) => Array.from({ length: 5 }, (_, i) => { const [x, y] = pt(0, 0, s * 0.5, i * 72); return `<circle cx="${x}" cy="${y}" r="${s * 0.38}"/>`; }).join('') + `<circle r="${s * 0.3}" fill="#f5c518"/>`,
    snow: (s) => `<path d="M0 ${-s}V${s}M${-s * 0.87} ${-s * 0.5}L${s * 0.87} ${s * 0.5}M${-s * 0.87} ${s * 0.5}L${s * 0.87} ${-s * 0.5}" fill="none" stroke-width="${s * 0.22}"/>`,
    note: (s) => `<ellipse cx="${-s * 0.25}" cy="${s * 0.55}" rx="${s * 0.42}" ry="${s * 0.32}"/><path d="M${s * 0.14} ${s * 0.5}V${-s}h${s * 0.5}" fill="none" stroke-width="${s * 0.18}"/>`,
  };
  const BORDERS = [
    ['line', 'Single line'], ['double', 'Double line'], ['triple', 'Three lines, three colours'], ['thickthin', 'Thick and thin'], ['rounded', 'Rounded corners'], ['dashes', 'Dashes'],
    ['dots', 'Dots'], ['stars', 'Stars'], ['hearts', 'Hearts'], ['diamonds', 'Diamonds'], ['flowers', 'Flowers'], ['snow', 'Snowflakes'],
    ['notes', 'Music notes'], ['checker', 'Checkerboard'], ['scallop', 'Scallops'], ['rope', 'Chain'], ['deco', 'Art deco corners'], ['confetti', 'Confetti'], ['piano', 'Piano keys'],
  ];
  const MULTI = ['#e8483f', '#3f8be8', '#f5c518', '#2e9b4f', '#7b4fd6', '#f59a23'];
  function borderSvg(style, w, h, size, color, inset = 0, c2 = '#e8483f', c3 = '#3f8be8') {
    const x0 = inset + size / 2, y0 = inset + size / 2, x1 = w - inset - size / 2, y1 = h - inset - size / 2;
    const L = (s) => `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${color}" ${s}/>`;
    let out = '';
    // Motifs spaced evenly along all four sides, corners included.
    const along = (step, f) => {
      const nx = Math.max(1, Math.round((x1 - x0) / step)), ny = Math.max(1, Math.round((y1 - y0) / step));
      let r = '';
      for (let i = 0; i <= nx; i++) { const x = x0 + ((x1 - x0) * i) / nx; r += f(x, y0, i) + f(x, y1, i + 1); }
      for (let j = 1; j < ny; j++) { const y = y0 + ((y1 - y0) * j) / ny; r += f(x0, y, j + 1) + f(x1, y, j); }
      return r;
    };
    const motif = (name, scale, multi) => along(size * 1.25, (x, y, i) => `<g transform="translate(${x} ${y})" fill="${multi ? MULTI[i % MULTI.length] : color}" stroke="${multi ? '#222222' : 'none'}" stroke-width="${size * 0.06}">${MOTIF[name](size * scale)}</g>`);
    switch (style) {
      case 'line': out = L(`stroke-width="${size * 0.35}"`); break;
      case 'double': out = `<rect x="${inset + size * 0.1}" y="${inset + size * 0.1}" width="${w - 2 * inset - size * 0.2}" height="${h - 2 * inset - size * 0.2}" fill="none" stroke="${color}" stroke-width="${size * 0.2}"/><rect x="${inset + size * 0.8}" y="${inset + size * 0.8}" width="${w - 2 * inset - size * 1.6}" height="${h - 2 * inset - size * 1.6}" fill="none" stroke="${color}" stroke-width="${size * 0.2}"/>`; break;
      case 'triple': { // outer, middle and inner lines, each in its own colour
        const band = (o, wd, col) => `<rect x="${inset + o + wd / 2}" y="${inset + o + wd / 2}" width="${w - 2 * (inset + o) - wd}" height="${h - 2 * (inset + o) - wd}" fill="none" stroke="${col}" stroke-width="${wd}"/>`;
        out = band(0, size * 0.4, color) + band(size * 0.4, size * 0.25, c2) + band(size * 0.65, size * 0.35, c3);
        break;
      }
      case 'thickthin': out = `<rect x="${inset + size * 0.25}" y="${inset + size * 0.25}" width="${w - 2 * inset - size * 0.5}" height="${h - 2 * inset - size * 0.5}" fill="none" stroke="${color}" stroke-width="${size * 0.5}"/><rect x="${inset + size * 0.9}" y="${inset + size * 0.9}" width="${w - 2 * inset - size * 1.8}" height="${h - 2 * inset - size * 1.8}" fill="none" stroke="${color}" stroke-width="${size * 0.12}"/>`; break;
      case 'rounded': out = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="${size * 2}" fill="none" stroke="${color}" stroke-width="${size * 0.35}"/>`; break;
      case 'dashes': out = L(`stroke-width="${size * 0.35}" stroke-dasharray="${size} ${size * 0.6}"`); break;
      case 'dots': out = motif('dot', 0.55); break;
      case 'stars': out = motif('star', 0.55); break;
      case 'hearts': out = motif('heart', 0.55); break;
      case 'diamonds': out = motif('diamond', 0.6); break;
      case 'flowers': out = motif('flower', 0.55, true); break;
      case 'snow': out = along(size * 1.4, (x, y) => `<g transform="translate(${x} ${y})" stroke="${color}">${MOTIF.snow(size * 0.5)}</g>`); break;
      case 'notes': out = motif('note', 0.5); break;
      case 'confetti': out = along(size * 0.9, (x, y, i) => `<circle cx="${x + ((i * 37) % 7 - 3) * size * 0.05}" cy="${y + ((i * 53) % 7 - 3) * size * 0.05}" r="${size * (0.2 + (i % 3) * 0.08)}" fill="${MULTI[i % MULTI.length]}"/>`); break;
      case 'checker': {
        const sq = size / 2;
        const nx = Math.max(2, Math.round((w - 2 * inset) / sq)), ny = Math.max(2, Math.round((h - 2 * inset) / sq)), sx = (w - 2 * inset) / nx, sy = (h - 2 * inset) / ny;
        for (let i = 0; i < nx; i++) for (let r = 0; r < 2; r++) {
          if ((i + r) % 2) continue;
          out += `<rect x="${inset + i * sx}" y="${inset + r * sy}" width="${sx}" height="${sy}" fill="${color}"/><rect x="${inset + i * sx}" y="${h - inset - (r + 1) * sy}" width="${sx}" height="${sy}" fill="${color}"/>`;
        }
        for (let j = 2; j < ny - 2; j++) for (let c = 0; c < 2; c++) {
          if ((j + c) % 2) continue;
          out += `<rect x="${inset + c * sx}" y="${inset + j * sy}" width="${sx}" height="${sy}" fill="${color}"/><rect x="${w - inset - (c + 1) * sx}" y="${inset + j * sy}" width="${sx}" height="${sy}" fill="${color}"/>`;
        }
        break;
      }
      case 'scallop': {
        const n = Math.max(4, Math.round((x1 - x0) / size)), m = Math.max(4, Math.round((y1 - y0) / size)), sx = (x1 - x0) / n, sy = (y1 - y0) / m;
        let d = `M${x0} ${y0}`;
        for (let i = 0; i < n; i++) d += `a${sx / 2} ${sx / 2} 0 0 1 ${sx} 0`;
        for (let j = 0; j < m; j++) d += `a${sy / 2} ${sy / 2} 0 0 1 0 ${sy}`;
        for (let i = 0; i < n; i++) d += `a${sx / 2} ${sx / 2} 0 0 1 ${-sx} 0`;
        for (let j = 0; j < m; j++) d += `a${sy / 2} ${sy / 2} 0 0 1 0 ${-sy}`;
        out = `<path d="${d}" fill="none" stroke="${color}" stroke-width="${size * 0.18}"/>`;
        break;
      }
      case 'rope': out = along(size * 0.9, (x, y, i) => `<ellipse cx="${x}" cy="${y}" rx="${size * 0.45}" ry="${size * 0.25}" transform="rotate(${45 + (i % 2) * 90} ${x} ${y})" fill="none" stroke="${color}" stroke-width="${size * 0.12}"/>`); break;
      case 'piano': {
        out = `<rect x="${inset}" y="${inset}" width="${w - 2 * inset}" height="${h - 2 * inset}" fill="none" stroke="${color}" stroke-width="${size * 0.1}"/><rect x="${inset + size}" y="${inset + size}" width="${w - 2 * inset - 2 * size}" height="${h - 2 * inset - 2 * size}" fill="none" stroke="${color}" stroke-width="${size * 0.1}"/>`;
        out += along(size * 0.5, (x, y, i) => (i % 7 === 2 || i % 7 === 6) ? '' : `<rect x="${x - size * 0.13}" y="${y - size * 0.3}" width="${size * 0.26}" height="${size * 0.6}" fill="${color}"/>`);
        break;
      }
      case 'deco': {
        const c = size * 2.4, s = size * 0.14;
        out = L(`stroke-width="${s}"`) + `<rect x="${x0 + size * 0.6}" y="${y0 + size * 0.6}" width="${x1 - x0 - size * 1.2}" height="${y1 - y0 - size * 1.2}" fill="none" stroke="${color}" stroke-width="${s}"/>`;
        [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => {
          out += `<path d="M${x} ${y + sy * c}L${x + sx * c} ${y}M${x} ${y + sy * c * 0.6}L${x + sx * c * 0.6} ${y}" stroke="${color}" stroke-width="${s * 1.6}" fill="none"/><circle cx="${x + sx * c * 0.32}" cy="${y + sy * c * 0.32}" r="${size * 0.3}" fill="${color}"/>`;
        });
        break;
      }
      default: out = L(`stroke-width="${size * 0.35}"`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${out}</svg>`;
  }

  // ------------------------------------------------------------------ Screen Magic
  // Kaleidoscope-style patterns from a seed: the same seed always gives the same picture.
  const MAGIC_STYLES = [['kaleido', 'Kaleidoscope'], ['burst', 'Starburst'], ['petals', 'Petals'], ['spiral', 'Spiral'], ['rings', 'Rings'], ['web', 'String art']];
  const PALETTES = {
    Rainbow: ['#e8483f', '#f59a23', '#f5c518', '#2e9b4f', '#3f8be8', '#7b4fd6'],
    Ocean: ['#0b3c5d', '#328cc1', '#3fb0ac', '#b9dcf7', '#1d6a96'],
    Fire: ['#7a0c02', '#e8483f', '#f59a23', '#f5c518', '#c1272d'],
    Garden: ['#2e9b4f', '#7bc96f', '#f7b6c8', '#f5c518', '#7b4fd6'],
    Candy: ['#ff6fb5', '#ffd1e8', '#8ad8ff', '#fff176', '#b28dff'],
    Black: ['#222222'],
  };
  function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
  function magicSvg(m, w, h) {
    const R = rng(m.seed), pal = PALETTES[m.palette] || PALETTES.Rainbow, col = (i) => pal[i % pal.length];
    const cx = w / 2, cy = h / 2, rmax = Math.min(w, h) / 2, sym = m.sym || 8, sw = Math.max(1, rmax * 0.012 * (m.weight || 1));
    let out = '';
    const P = (r, a) => [cx + r * Math.sin(rad(a)), cy - r * Math.cos(rad(a))];
    const mirror = (pts, close) => {
      let r = '';
      for (let k = 0; k < sym; k++) for (const flip of [1, -1]) {
        const d = pts.map(([pr, pa], i) => { const [x, y] = P(pr, flip * pa + (k * 360) / sym); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join('') + (close ? 'Z' : '');
        r += d;
      }
      return r;
    };
    switch (m.style) {
      case 'burst': {
        const n = sym * 4;
        for (let i = 0; i < n; i++) { const a = (i * 360) / n, r1 = rmax * (0.1 + R() * 0.15), r2 = rmax * (0.6 + R() * 0.4); const [x1, y1] = P(r1, a), [x2, y2] = P(r2, a), [x3, y3] = P(r2, a + 180 / n); out += `<path d="M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}Z" fill="${col(i)}" stroke="none"/>`; }
        out += `<circle cx="${cx}" cy="${cy}" r="${rmax * 0.12}" fill="${col(1)}"/>`;
        break;
      }
      case 'petals': {
        for (let layer = 3; layer >= 1; layer--) {
          const rr = rmax * (0.3 * layer), rw = rr * (0.18 + R() * 0.2);
          for (let k = 0; k < sym; k++) { const a = (k * 360) / sym + layer * (90 / sym); const [x, y] = P(rr * 0.55, a); out += `<ellipse cx="${x}" cy="${y}" rx="${rw}" ry="${rr * 0.5}" transform="rotate(${a} ${x} ${y})" fill="${col(layer + k % 2)}" stroke="#222" stroke-width="${sw * 0.6}"/>`; }
        }
        out += `<circle cx="${cx}" cy="${cy}" r="${rmax * 0.1}" fill="${col(0)}" stroke="#222" stroke-width="${sw * 0.6}"/>`;
        break;
      }
      case 'spiral': {
        const arms = sym, turns = 1.5 + R() * 2;
        for (let k = 0; k < arms; k++) {
          let d = '';
          for (let t = 0; t <= 120; t++) { const f = t / 120, [x, y] = P(rmax * f, (k * 360) / arms + f * 360 * turns); d += `${t ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }
          out += `<path d="${d}" fill="none" stroke="${col(k)}" stroke-width="${sw * 3}"/>`;
        }
        break;
      }
      case 'rings': {
        const n = 6 + Math.floor(R() * 6);
        for (let i = n; i >= 1; i--) {
          const r = (rmax * i) / n, pts = [];
          for (let k = 0; k < sym * 2; k++) pts.push(P(r * (k % 2 ? 0.82 + R() * 0.1 : 1), (k * 180) / sym + i * 7));
          out += `<path d="${pts.map(([x, y], j) => `${j ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')}Z" fill="${col(i)}" stroke="#222" stroke-width="${sw * 0.5}"/>`;
        }
        break;
      }
      case 'web': {
        const n = sym * 3;
        const pts = Array.from({ length: n }, (_, i) => P(rmax * 0.98, (i * 360) / n));
        const step = 2 + Math.floor(R() * (n / 2 - 2));
        for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + step) % n]; out += `<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}" stroke="${col(i)}" stroke-width="${sw * 1.4}" fill="none"/>`; }
        break;
      }
      default: { // kaleido: random shapes in one wedge, mirrored all the way round
        const count = 5 + Math.floor(R() * 5);
        for (let s = 0; s < count; s++) {
          const pts = Array.from({ length: 3 + Math.floor(R() * 3) }, () => [rmax * (0.1 + R() * 0.9), R() * (180 / sym)]);
          out += `<path d="${mirror(pts, true)}" fill="${col(s)}" fill-opacity="${0.55 + R() * 0.4}" stroke="#222" stroke-width="${sw * 0.7}"/>`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${out}</svg>`;
  }

  window.PressArt = { ART, ART_BY_ID, clipSvg, BORDERS, borderSvg, MAGIC_STYLES, PALETTES, magicSvg };
})();
