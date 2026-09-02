const fs = require('fs');
let code = fs.readFileSync('src/main.js', 'utf8');

code = code.replace(
    /scaleFn\(dummy, item\);\r?\n\s+dummy\.rotation\.set\(0, 0, 0\);/g,
    `dummy.rotation.set(0, 0, 0);
            scaleFn(dummy, item);`
);

fs.writeFileSync('src/main.js', code);
console.log("Fixed rotation overwrite in createBatch!");
