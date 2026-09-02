const fs = require('fs');

let code = fs.readFileSync('src/main.js', 'utf8');

code = code.replace(
    /function getBlockType\(row, col\) \{[\s\S]*?const dr = row - GRID_RADIUS;/m,
    `function getBlockType(row, col) {
    if (row === GRID_SIZE - 1 && col === GRID_SIZE - 1) return 'power_plant';
    if (row === 0 && col === 0) return 'solar_farm';
    if (row === GRID_SIZE - 1 && col === 0) return 'wind_farm';
    if (row === 3 && col === 3) return 'substation';
    if (row === GRID_SIZE - 4 && col === GRID_SIZE - 4) return 'substation';

    const dr = row - GRID_RADIUS;`
);

code = code.replace(
    /if \(type === 'solar_farm'\) return 'Fazenda_Solar';/,
    `if (type === 'solar_farm') return 'Fazenda_Solar';
    if (type === 'wind_farm') return 'Fazenda_Eolica';`
);

fs.writeFileSync('src/main.js', code);
console.log("Done upgrading grid locations!");
