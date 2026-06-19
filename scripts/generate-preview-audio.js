import fs from 'fs';
import path from 'path';
import https from 'https';

// Usage:
// node scripts/generate-preview-audio.js --key=YOUR_ELEVENLABS_API_KEY [--voice=bfGb7JTLUnZebZRiFYyq]

function getArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      args[key] = val;
    }
  });
  return args;
}

function makeBinaryRequest(url, body, apiKey) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'audio/mpeg'
      },
      family: 4, // Force IPv4 to avoid WSL DNS timeouts
      timeout: 30000 // 30 seconds
    };

    const req = https.request(options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errData = '';
        res.on('data', chunk => errData += chunk);
        res.on('end', () => reject(new Error(`ElevenLabs Status ${res.statusCode}: ${errData}`)));
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const args = getArgs();
  
  // Try loading API key from .env.local if not passed as CLI argument
  let apiKey = args.key;
  if (!apiKey) {
    const envPath = '.env.local';
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/ELEVENLABS_API_KEY\s*=\s*(.*)/);
      if (match) {
        apiKey = match[1].trim();
        // Remove quotes if present
        if (apiKey.startsWith('"') && apiKey.endsWith('"')) apiKey = apiKey.slice(1, -1);
        if (apiKey.startsWith("'") && apiKey.endsWith("'")) apiKey = apiKey.slice(1, -1);
      }
    }
  }

  if (!apiKey) {
    console.error('❌ Error: ElevenLabs API Key is missing.');
    console.log('Please run the script with: node scripts/generate-preview-audio.js --key=YOUR_ELEVENLABS_KEY');
    console.log('Or define ELEVENLABS_API_KEY in your .env.local file.');
    process.exit(1);
  }

  // Pre-made or cloned ElevenLabs Voice ID (default: Adam/bfGb7JTLUnZebZRiFYyq or whatever voice you prefer)
  const voiceId = args.voice || 'bfGb7JTLUnZebZRiFYyq';

  // Find desktop path dynamically
  const candidates = [
    '/mnt/c/Users/eitan/OneDrive/Desktop',
    '/mnt/c/Users/eitan/Desktop',
    'C:/Users/eitan/OneDrive/Desktop',
    'C:/Users/eitan/Desktop'
  ];

  let desktopPath = null;
  let htmlPath = null;

  for (const candidate of candidates) {
    const checkPath = path.join(candidate, 'l14-performance-max-preview.html');
    if (fs.existsSync(checkPath)) {
      desktopPath = candidate;
      htmlPath = checkPath;
      break;
    }
  }

  if (!htmlPath) {
    console.error(`❌ Error: HTML preview file 'l14-performance-max-preview.html' not found on Desktop.`);
    process.exit(1);
  }

  const outputDir = path.join(desktopPath, 'audio');

  // 1. Read HTML and extract narrations array
  console.log(`📖 Reading slide narrations from: ${htmlPath}`);
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  const arrayMatch = htmlContent.match(/const narrations = \s*\[\s*([\s\S]*?)\s*\];/);
  if (!arrayMatch) {
    console.error('❌ Error: Could not find narrations array in HTML file.');
    process.exit(1);
  }

  // Parse narrations array safely using eval (since it's a static JS array in our own HTML preview)
  let narrations;
  try {
    narrations = eval('[' + arrayMatch[1] + ']');
  } catch (err) {
    console.error('❌ Error parsing narrations array:', err.message);
    process.exit(1);
  }

  console.log(`📋 Found ${narrations.length} slides to synthesize using ElevenLabs.`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created audio output directory: ${outputDir}`);
  }

  // 2. Synthesize each slide narration
  for (let i = 0; i < narrations.length; i++) {
    const slideNum = i + 1;
    const text = narrations[i];
    const outputFile = path.join(outputDir, `slide-${slideNum}.mp3`);
    
    console.log(`🎙️ Synthesizing Slide ${slideNum}/${narrations.length} with ElevenLabs... (${text.substring(0, 30)}...)`);

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const body = {
      text: text,
      model_id: 'eleven_v3', // v2 or v3
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    };

    try {
      const audioBuffer = await makeBinaryRequest(url, body, apiKey);
      fs.writeFileSync(outputFile, audioBuffer);
      console.log(`✅ Saved Slide ${slideNum} audio to: ${outputFile}`);
      
      // Brief pause to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`❌ Failed on Slide ${slideNum}:`, err.message);
      process.exit(1);
    }
  }

  console.log('\n🎉 Audio synthesis completed successfully!');
  console.log(`🎵 Audio files are ready in: [audio/](file:///${outputDir}) next to your HTML preview file.`);
}

main();
