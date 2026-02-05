
const API_URL = 'http://localhost:3001/api';

async function testApi() {
    try {
        console.log('--- API Test (Cookie Auth) ---');

        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'consultancy@allinbox.com',
                password: 'password123'
            })
        });

        console.log('Login Status:', loginRes.status);
        if (!loginRes.ok) {
            console.error('Login Failed:', await loginRes.text());
            return;
        }

        // Extract Cookie
        const setCookie = loginRes.headers.get('set-cookie');
        if (!setCookie) {
            console.error('No set-cookie header received!');
            return;
        }
        console.log('Cookie received.');

        // 2. Fetch Interactions
        console.log('Fetching Interactions...');
        // Pass the cookie manually
        const interactionsRes = await fetch(`${API_URL}/interactions`, {
            headers: {
                'Cookie': setCookie
            }
        });

        console.log('Interactions Status:', interactionsRes.status);
        if (!interactionsRes.ok) {
            const err = await interactionsRes.text();
            console.error('Fetch Failed:', err);
            return;
        }

        const interactionsData: any = await interactionsRes.json();
        console.log('Interactions Count:', interactionsData.length);
        if (interactionsData.length > 0) {
            console.log('First Interaction:', interactionsData[0]);
        } else {
            console.log('Warning: No Interactions found.');
        }

    } catch (err: any) {
        console.error('API Error:', err.message);
        if (err.cause) {
            console.error('Cause:', err.cause);
        }
    }
}

testApi();
