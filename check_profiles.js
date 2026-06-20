const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ovjilgaxdfeunyzpyyrh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92amlsZ2F4ZGZldW55enB5eXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDcyMjcsImV4cCI6MjA5NTE4MzIyN30.DvLlPZCR429WSOQtSNeL8tFtqf0sfgXSgNVladnRO9E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, hotel_id');
  
  console.log("Profiles data:", JSON.stringify(data, null, 2));
  if (error) {
    console.error("Error fetching profiles:", error);
  }
}

check();
