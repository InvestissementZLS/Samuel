const response = await fetch('https://www.praxiszls.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'samuel.leveille.forex@gmail.com',
        password: 'Admin1234!'
    })
});
const text = await response.text();
console.log('Status:', response.status);
console.log('Body:', text);
