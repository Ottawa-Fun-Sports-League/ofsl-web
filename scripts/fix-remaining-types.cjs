#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Fixing remaining type issues...\n');

// Fix files that have supabase.from mock issues
const supabaseFromFiles = [
  'src/screens/LeagueDetailPage/components/__tests__/IndividualRegistration.integration.test.tsx',
  'src/screens/LeagueDetailPage/components/__tests__/IndividualRegistrationNotification.integration.test.tsx', 
  'src/screens/LeagueDetailPage/components/__tests__/IndividualRegistrationNotification.test.tsx',
  'src/screens/LeagueDetailPage/components/__tests__/IndividualWaitlist.integration.test.tsx'
];

supabaseFromFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace direct MockSupabaseChain with proper casting
    content = content.replace(
      /vi\.mocked\(supabase\.from\)\.mockImplementation\((.*?)\);/g,
      'vi.mocked(supabase.from).mockImplementation($1 as unknown as any);'
    );
    
    // Fix league_ids property access on any[]
    content = content.replace(
      /\.league_ids/g,
      '?.league_ids'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed ${filePath}`);
  }
});

// Fix unused variable _mockNavigate 
const waitlistFile = 'src/screens/LeagueDetailPage/components/__tests__/IndividualWaitlist.integration.test.tsx';
if (fs.existsSync(waitlistFile)) {
  let content = fs.readFileSync(waitlistFile, 'utf8');
  content = content.replace(
    'const _mockNavigate = mockNavigate;',
    'void mockNavigate; // _mockNavigate'
  );
  fs.writeFileSync(waitlistFile, content);
  console.log(`✓ Fixed unused variable in ${waitlistFile}`);
}

// Fix _MockSessionData unused variable
const teamRegFile = 'src/screens/LeagueDetailPage/components/__tests__/TeamRegistrationModal.test.tsx';
if (fs.existsSync(teamRegFile)) {
  let content = fs.readFileSync(teamRegFile, 'utf8');
  content = content.replace(
    'const _MockSessionData = MockSessionData;',
    'void MockSessionData; // _MockSessionData'
  );
  fs.writeFileSync(teamRegFile, content);
  console.log(`✓ Fixed unused variable in ${teamRegFile}`);
}

// Fix MockAuthReturn casting issues with proper type assertions
const authReturnFiles = [
  'src/screens/LeagueDetailPage/components/__tests__/IndividualRegistrationNotification.integration.test.tsx',
  'src/screens/LeagueDetailPage/components/__tests__/IndividualWaitlist.integration.test.tsx',
  'src/screens/LeagueDetailPage/components/__tests__/TeamRegistrationModal.test.tsx'
];

authReturnFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace MockAuthReturn casts with proper type assertion
    content = content.replace(
      /as MockAuthReturn/g,
      'as unknown as AuthContextType'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed AuthContext type in ${filePath}`);
  }
});

console.log('\n✓ Type fixes applied!');