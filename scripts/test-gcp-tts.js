import fs from 'fs';
import path from 'path';
import https from 'https';

// Usage:
// node scripts/test-gcp-tts.js --key=YOUR_API_KEY [--voice=he-IL-Neural2-F] [--text="טקסט לדוגמה"]
// Or set environment variable: GCP_API_KEY=YOUR_API_KEY node scripts/test-gcp-tts.js

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

// Custom request helper using native https module to avoid undici/fetch DNS bugs in WSL
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      family: 4, // Force IPv4 to avoid slow IPv6 fallbacks in WSL/high-latency networks
      timeout: 15000 // 15 seconds timeout for weak connections
    };

    const req = https.request(requestOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          json: () => Promise.resolve(JSON.parse(rawData)),
          text: () => Promise.resolve(rawData)
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function main() {
  const args = getArgs();
  const apiKey = args.key || process.env.GCP_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: GCP API Key is missing.');
    console.log('\nPlease run the script with one of the following methods:');
    console.log('1. Command line argument: node scripts/test-gcp-tts.js --key=YOUR_API_KEY');
    console.log('2. Environment variable:  GCP_API_KEY=YOUR_API_KEY node scripts/test-gcp-tts.js');
    process.exit(1);
  }

  const voiceName = args.voice || 'he-IL-Neural2-F';
  const sampleText = args.text || 'שָׁלוֹם, כָּאן מְדַבֵּר הַקַּרְיָן הַדִּיגִיטָלִי שֶׁלָּכֶם. אֲנַחְנוּ בּוֹדְקִים כָּעֵת אֶת הַחִיבּוּר לְשֵׁרוּת הַקְרָאָת הַטֶּקְסְט שֶׁל גּוּגֶל.';

  console.log(`🤖 Testing connection to Google Cloud Text-to-Speech API...`);
  console.log(`🗣️ Selected Voice: ${voiceName}`);
  console.log(`📝 Text to synthesize: "${sampleText}"`);

  // 1. First, fetch available Hebrew voices to verify connectivity and list options
  try {
    const listUrl = `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}&languageCode=he-IL`;
    const listResponse = await makeRequest(listUrl);
    
    if (!listResponse.ok) {
      const errText = await listResponse.text();
      throw new Error(`Failed to fetch voices list: ${listResponse.status} ${listResponse.statusText}\nDetails: ${errText}`);
    }

    const voiceData = await listResponse.json();
    console.log('\n✅ Connection Verified! Available Hebrew voices found on Google Cloud:');
    
    const heILVoices = voiceData.voices || [];
    heILVoices.forEach(v => {
      console.log(` - ${v.name} (${v.ssmlGender}, Style: ${v.name.includes('Neural2') ? 'Neural2 🌟' : v.name.includes('Wavenet') ? 'Wavenet' : 'Standard'})`);
    });
  } catch (error) {
    console.error('\n❌ Error connecting to GCP TTS API (Voice List Check):');
    console.error(error.message);
    process.exit(1);
  }

  // 2. Synthesize test text
  try {
    console.log(`\n🎙️ Synthesizing speech...`);
    const synthUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    const body = {
      input: { text: sampleText },
      voice: {
        languageCode: 'he-IL',
        name: voiceName
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0
      }
    };

    const synthResponse = await makeRequest(synthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body
    });

    if (!synthResponse.ok) {
      const errText = await synthResponse.text();
      throw new Error(`Failed to synthesize speech: ${synthResponse.status} ${synthResponse.statusText}\nDetails: ${errText}`);
    }

    const result = await synthResponse.json();
    if (!result.audioContent) {
      throw new Error('Response did not contain audioContent.');
    }

    // Decode base64 to binary buffer
    const audioBuffer = Buffer.from(result.audioContent, 'base64');
    
    // Save to outputs folder or scratch
    const outputDir = './scratch';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'test-gcp-hebrew.mp3');
    fs.writeFileSync(outputPath, audioBuffer);

    console.log(`\n🎉 Success! Speech synthesized successfully.`);
    console.log(`💾 Audio saved to: [test-gcp-hebrew.mp3](file:///${path.resolve(outputPath).replace(/\\/g, '/')})`);
  } catch (error) {
    console.error('\n❌ Error during speech synthesis:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
