const imghash = require('imghash');
const hamming = require('hamming-distance');

const hash1 = imghash.hash('../testimgs/test1.jpg');
const hash2 = imghash.hash('../testimgs/test3.jpg');

Promise
    .all([hash1, hash2])
    .then((results) => {
        const dist = hamming(results[0], results[1]);
        console.log(`Distance between images is: ${dist}`);
        if (dist <= 20) {
            console.log('Images are similar');
        } else {
            console.log('Images are NOT similar');
        }
    });