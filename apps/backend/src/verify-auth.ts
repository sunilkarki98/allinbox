import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api/auth';

async function testAuth() {
    const email = `test+${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`Testing with ${email}...`);

    // 1. Register
    console.log('1. Registering...');
    const regRes = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!regRes.ok) {
        console.error('Registration failed:', await regRes.text());
        process.exit(1);
    }
    const regData = await regRes.json();
    console.log('Registration success:', regData);

    // 2. Login
    console.log('2. Logging in...');
    const loginRes = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text());
        process.exit(1);
    }
    const loginData = await loginRes.json();
    console.log('Login success:', loginData);

    console.log('Auth Flow Verified!');
}

testAuth();
