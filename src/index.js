const Nightmare = require('nightmare');
const Axios = require('axios');
const Path = require('path');
const Fs = require('fs');
const HlsFetcher = require('hls-fetcher');
const Tmp = require('tmp');
const { spawn } = require('child_process');
const sanitize = require("sanitize-filename");
const Rimraf = require('rimraf');
const argv = require('yargs').argv;

if (!argv.username) {
  throw new Error('Please provide your Kent username. (--username [USERNAME])');
}

if (!argv.password) {
  throw new Error('Please provide your Kent password. (--password [PASSWORD])');
}

if (!argv.stream) {
  throw new Error('Please provide a Kent Player link. (--stream [STREAM])');
}

let authToken;

function getToken(username, password) {
  const nightmare = Nightmare();

  return new Promise((resolve, reject) => {
    nightmare
      .goto('https://kent.cloud.panopto.eu/Panopto/Pages/Viewer.aspx?id=794da212-89dc-4d92-9da9-2d47311ef8d9')
      .insert('#username', username)
      .insert('#password', password)
      .click('.login #submitButton')
      .wait('#recorderPopup')
      .cookies.get()
      .end()
      .then((cookies) => {
        resolve(cookies.find(c => c.name === '.ASPXAUTH').value);
      })
      .catch(error => {
        reject(error);
      });
  });
}

function getStreamUrl(videoId) {
  return Axios.get('https://kent.cloud.panopto.eu/Panopto/Pages/Viewer/DeliveryInfo.aspx', {
    params: {
      deliveryId: videoId,
      responseType: 'json',
    },
    headers: {
      Cookie: `.ASPXAUTH=${authToken};`,
      ContentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  });
}

async function downloadStream(streamUrl, outputName) {
  const tempDir = Tmp.dirSync();

  await HlsFetcher({
    input: streamUrl,
    output: tempDir.name,
    concurrency: Infinity,
    decrypt: false
  });

  const inputPath = Path.resolve(
    tempDir.name,
    Fs.readdirSync(tempDir.name).filter(fileName => fileName.startsWith('master.m3u8'))[0]
  );

  const outputPath = Path.resolve(__dirname, '../out', `${outputName.trim().replace(/ /g, '-')}.mp4`);
  Fs.mkdirSync(Path.dirname(outputPath), { recursive: true });

  const [command, ...args] = `ffmpeg -i ${inputPath} -acodec copy -vcodec copy ${outputPath}`.split(' ');
  const child = spawn(command, args);

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  process.stdin.pipe(child.stdin);

  await (new Promise(resolve => {
    child.on('close', () => {
      resolve();
    });
  }));

  process.stdin.unpipe(child.stdin);

  Rimraf(tempDir.name, () => {});

  tempDir.removeCallback();
}

async function main() {
  authToken = await getToken(argv.username, argv.password);

  const { data } = await getStreamUrl(argv.stream.includes('id=')
    ? argv.stream.split('id=')[1].split('&')[0]
    : argv.stream
  );

  for (let i = 0; i < data.Delivery.Streams.length; i += 1) {
    const stream = data.Delivery.Streams[0];
    console.log(i, stream.StreamUrl);
    await downloadStream(stream.StreamUrl, `${sanitize(data.Delivery.SessionGroupLongName)}/${data.Delivery.SessionName}`);
  }

  console.log('Done.')
}

main();
