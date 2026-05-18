import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export const generateAudio = async (text: string): Promise<string> => {
  const apiKey = process.env.ELEVENLABS_API_KEY || '';
  const voiceId = 'FGY2WhTYpPnrIDTdsKH5';

  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const fileName = `call_${Date.now()}.mp3`;
  const filePath = path.join(audioDir, fileName);

  const body = JSON.stringify({
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`ElevenLabs HTTP ${res.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        fs.writeFileSync(filePath, Buffer.concat(chunks));
        resolve(fileName);
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};
