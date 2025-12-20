const https = require('https');

const PROJECT_REF = 'nrtkbulkzhhlstaomvas';
const ACCESS_TOKEN = 'sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296'; // User provided PAT
const SITE_URL = 'https://sori-frontend.vercel.app';

function updateAuthConfig() {
  const data = JSON.stringify({
    site_url: SITE_URL,
    uri_allow_list: 'https://sori-frontend.vercel.app,https://sori-frontend.vercel.app/**,http://localhost:3000,http://localhost:5173'
  });

  const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${PROJECT_REF}/config/auth`,
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ Auth Config Updated Successfully!');
        console.log('New Site URL:', SITE_URL);
      } else {
        console.error('❌ Failed to update config:', body);
      }
    });
  });

  req.on('error', (e) => console.error(e));
  req.write(data);
  req.end();
}

updateAuthConfig();
