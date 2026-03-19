import https from 'https';

https.get('https://www.ultimate-guitar.com/search.php?search_type=title&value=donna+donna', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Data length:', data.length);
    if (data.includes('js-store')) console.log('Found js-store!');
  });
}).on('error', err => console.error(err));
