export function seededRandom(seed) {
    let value = seed % 2147483647;
    return () => {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}

export function noise(row, col, salt = 0) {
    const value = Math.sin(row * 127.1 + col * 311.7 + salt * 74.7) * 43758.5453;
    return value - Math.floor(value);
}
