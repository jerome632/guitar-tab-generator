import https from 'https';

https.get('https://www.e-chords.com/search-all/donna%20donna', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Data length:', data.length);
  });
}).on('error', err => console.error(err));
