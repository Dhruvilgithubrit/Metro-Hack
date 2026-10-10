import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = process.argv[2] || 'http://localhost:5173/';
const metro = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/metro.json'), 'utf8'));
const qrDir = path.join(__dirname, '../qr');

if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);

async function generate() {
  for (const line of metro.lines) {
    for (const st of line.stations) {
      const urlLift1 = `${baseUrl}#/report?src=lift&station=${encodeURIComponent(st.id)}&asset=Lift-1`;
      const urlLift2 = `${baseUrl}#/report?src=lift&station=${encodeURIComponent(st.id)}&asset=Lift-2`;
      const urlStation = `${baseUrl}#/report?src=station&station=${encodeURIComponent(st.id)}`;
      
      await QRCode.toFile(path.join(qrDir, `${st.id}_Lift-1.png`), urlLift1);
      await QRCode.toFile(path.join(qrDir, `${st.id}_Lift-2.png`), urlLift2);
      await QRCode.toFile(path.join(qrDir, `${st.id}_Station.png`), urlStation);
    }
  }

  await QRCode.toFile(path.join(qrDir, 'T07_C3.png'), `${baseUrl}#/report?src=coach&train=T07&coach=C3&line=Blue%20Line`);
  await QRCode.toFile(path.join(qrDir, 'T08_C1.png'), `${baseUrl}#/report?src=coach&train=T08&coach=C1&line=Red%20Line`);
  await QRCode.toFile(path.join(qrDir, 'T09_C4.png'), `${baseUrl}#/report?src=coach&train=T09&coach=C4&line=Blue%20Line`);

  console.log('QR codes generated in ./qr/');
}

generate();
