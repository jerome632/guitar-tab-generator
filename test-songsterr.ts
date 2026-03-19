import https from 'https';

https.get('https://www.songsterr.com/a/ra/songs.json?pattern=donna+donna', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Data:', data.substring(0, 500));
  });
}).on('error', err => console.error(err));
