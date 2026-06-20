const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ovjilgaxdfeunyzpyyrh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92amlsZ2F4ZGZldW55enB5eXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDcyMjcsImV4cCI6MjA5NTE4MzIyN30.DvLlPZCR429WSOQtSNeL8tFtqf0sfgXSgNVladnRO9E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'admin'
  });

  if (authError) {
    console.error("Auth error:", authError);
    return;
  }

  const config = {
    "_order": [
      "Standard Non Ac Room",
      "Standard Room",
      "Deluxe Room",
      "Suite Room"
    ],
    "Suite Room": ["401", "402", "403", "404"],
    "Deluxe Room": ["201", "202"],
    "Standard Room": ["101", "102", "103"],
    "Standard Non Ac Room": ["104", "105", "106"]
  };

  const { data, error } = await supabase
    .from('hotels')
    .update({ room_config: config })
    .eq('id', '19875944-1344-4957-93e1-e908df05bca4')
    .select();

  console.log("Update output data:", data, "Error:", error);
}

run();
