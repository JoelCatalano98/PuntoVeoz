const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;
const fs = require('fs');

async function main() {
    const input = '../client/public/AccesoDirecto.png';
    const outputPng = 'temp.png';
    const outputIco = '../client/public/AccesoDirecto.ico';

    console.log("Processing image...");
    
    await sharp(input)
        .trim() // Trim transparent edges to make the icon larger in the bounding box
        .resize(256, 256, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 } // Ensures transparency, no black corners
        })
        .toFile(outputPng);

    console.log("Image trimmed and resized. Converting to ICO...");
    const buf = await pngToIco(outputPng);
    
    fs.writeFileSync(outputIco, buf);
    console.log("ICO created successfully!");
}

main().catch(console.error);
