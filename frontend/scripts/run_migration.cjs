const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = 'nrtkbulkzhhlstaomvas';
const ACCESS_TOKEN = 'sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296'; // Token provided by user
const SQL_FILE_PATH = path.join(__dirname, '../../supabase/migrations/20251221_storage.sql');

function executeQuery(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });

    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_ID}/database/query`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (error) {
            // Sometimes it returns text or empty
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    console.log(`Reading SQL from ${SQL_FILE_PATH}...`);
    const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf8');

    console.log(`Executing SQL on project ${PROJECT_ID}...`);
    const result = await executeQuery(sqlContent);
    
    console.log('✅ Success! SQL executed.');
    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
    process.exit(1);
  }
}

main();
