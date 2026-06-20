const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'environments', 'environment.ts');
const targetPathDev = path.join(__dirname, 'src', 'environments', 'environment.development.ts');

// Ensure environments directory exists
const dirPath = path.dirname(targetPath);
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
}

// Generate the content string based on process.env
// If env vars are not set (like in local development), fallback to the known public keys
const defaultUrl = 'https://ovjilgaxdfeunyzpyyrh.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92amlsZ2F4ZGZldW55enB5eXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDcyMjcsImV4cCI6MjA5NTE4MzIyN30.DvLlPZCR429WSOQtSNeL8tFtqf0sfgXSgNVladnRO9E';

const envConfigFile = `export const environment = {
  production: true,
  supabaseUrl: '${process.env.SUPABASE_URL || process.env.supabaseUrl || defaultUrl}',
  supabaseKey: '${process.env.SUPABASE_KEY || process.env.supabaseKey || defaultKey}'
};
`;

const envConfigFileDev = `export const environment = {
  production: false,
  supabaseUrl: '${process.env.SUPABASE_URL || process.env.supabaseUrl || defaultUrl}',
  supabaseKey: '${process.env.SUPABASE_KEY || process.env.supabaseKey || defaultKey}'
};
`;

fs.writeFileSync(targetPath, envConfigFile);
console.log(`Output generated at ${targetPath}`);

fs.writeFileSync(targetPathDev, envConfigFileDev);
console.log(`Output generated at ${targetPathDev}`);
