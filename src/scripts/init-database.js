// This is a script to manually initialize your database tables
// You can run it with: node scripts/init-database.js
// Make sure to set up your .env file first

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // You need to add this to your .env.local

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializeDatabase() {
  console.log('Initializing database...');

  try {
    // Create a basic academic year if none exists
    const { data: existingYears, error: yearCheckError } = await supabase
      .from('academic_years')
      .select('*')
      .limit(1);

    if (yearCheckError) {
      throw new Error(`Error checking academic years: ${yearCheckError.message}`);
    }

    if (!existingYears || existingYears.length === 0) {
      console.log('Creating default academic year...');
      
      const currentYear = new Date().getFullYear();
      const { error: yearError } = await supabase
        .from('academic_years')
        .insert({
          name: `${currentYear}-${currentYear + 1}`,
          start_date: `${currentYear}-09-01`,
          end_date: `${currentYear + 1}-06-30`,
          is_current: true
        });

      if (yearError) {
        throw new Error(`Error creating academic year: ${yearError.message}`);
      }
      console.log('Default academic year created successfully');
    } else {
      console.log('Academic years already exist, skipping creation');
    }

    // Check if we have any admin users
    const { data: existingAdmins, error: adminCheckError } = await supabase
      .from('teachers')
      .select('*')
      .eq('is_admin', true)
      .limit(1);

    if (adminCheckError) {
      throw new Error(`Error checking admin users: ${adminCheckError.message}`);
    }

    if (!existingAdmins || existingAdmins.length === 0) {
      console.log('No admin users found. To create one, use the registration page and then update the is_admin field in the database.');
    } else {
      console.log('Admin users already exist');
    }

    console.log('Database initialization complete!');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Run the initialization
initializeDatabase();