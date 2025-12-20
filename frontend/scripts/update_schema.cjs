const https = require('https');

const PROJECT_REF = 'nrtkbulkzhhlstaomvas';
const ACCESS_TOKEN = 'sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296'; // PAT

const SQL = `
alter table playlists add column if not exists description text;
alter table playlists add column if not exists audio_url text;
`;

function runMigration() {
  const data = JSON.stringify({ query: SQL });

  const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${PROJECT_REF}/database/query`,
    method: 'POST',
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
      if (res.statusCode === 200) {
        console.log('✅ Schema Updated Successfully!');
      } else {
        console.error('❌ Failed to update schema:', body);
      }
    });
  });

  req.on('error', (e) => console.error(e));
  req.write(data);
  req.end();
}

runMigration();
