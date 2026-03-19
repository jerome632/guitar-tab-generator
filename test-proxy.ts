import https from 'https';

const url = 'https://corsproxy.io/?' + encodeURIComponent('https://www.ultimate-guitar.com/search.php?search_type=title&value=donna+donna');
https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Data length:', data.length);
    if (data.includes('js-store')) console.log('Found js-store!');
  });
}).on('error', err => console.error(err));
