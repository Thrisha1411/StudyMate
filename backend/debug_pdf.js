const pdf = require('pdf-parse');
console.log('Type of pdf:', typeof pdf);
console.log('Is pdf a function?', typeof pdf === 'function');
console.log('Keys of pdf:', Object.keys(pdf));

try {
    if (typeof pdf !== 'function') {
        console.log('Attempting to find the function...');
        if (pdf.default && typeof pdf.default === 'function') {
            console.log('Found default export!');
        }
    }
} catch (e) {
    console.error(e);
}
