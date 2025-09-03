const fetch = require('node-fetch');

async function testResetPassword() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/resetpassword/test123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'newpassword123'
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testResetPassword();
