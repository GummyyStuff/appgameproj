import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    errors: ['rate<0.1'],             // Custom error rate must be below 10%
  },
};

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'testpass123', username: 'testuser1' },
  { email: 'test2@example.com', password: 'testpass123', username: 'testuser2' },
  { email: 'test3@example.com', password: 'testpass123', username: 'testuser3' },
];

let authToken = '';

export function setup() {
  // Create test users if they don't exist
  testUsers.forEach(user => {
    const registerResponse = http.post(`${BASE_URL}/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (registerResponse.status === 201 || registerResponse.status === 409) {
      console.log(`User ${user.username} ready for testing`);
    }
  });
}

export default function () {
  // Select random test user
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Test user authentication
  testAuthentication(user);
  
  if (authToken) {
    // Test game endpoints
    testRouletteGame();
    testBlackjackGame();

    
    // Test user endpoints
    testUserProfile();
    testGameHistory();
  }
  
  sleep(1);
}

function testAuthentication(user) {
  const loginPayload = {
    email: user.email,
    password: user.password,
  };
  
  const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.token;
      } catch (e) {
        return false;
      }
    },
    'login response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  if (loginSuccess && loginResponse.status === 200) {
    try {
      const body = JSON.parse(loginResponse.body);
      authToken = body.data.token;
    } catch (e) {
      errorRate.add(1);
    }
  } else {
    errorRate.add(1);
  }
}

function testRouletteGame() {
  if (!authToken) return;
  
  const rouletteBet = {
    betAmount: 100,
    betType: 'red',
    betValue: null,
  };
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };
  
  const rouletteResponse = http.post(`${BASE_URL}/games/roulette/bet`, JSON.stringify(rouletteBet), { headers });
  
  const rouletteSuccess = check(rouletteResponse, {
    'roulette bet status is 200': (r) => r.status === 200,
    'roulette response has game data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && typeof body.data.winningNumber === 'number';
      } catch (e) {
        return false;
      }
    },
    'roulette response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  if (!rouletteSuccess) {
    errorRate.add(1);
  }
}

function testBlackjackGame() {
  if (!authToken) return;
  
  const blackjackBet = {
    betAmount: 100,
  };
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };
  
  // Start blackjack game
  const startResponse = http.post(`${BASE_URL}/games/blackjack/start`, JSON.stringify(blackjackBet), { headers });
  
  const startSuccess = check(startResponse, {
    'blackjack start status is 200': (r) => r.status === 200,
    'blackjack start has game data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.gameId && body.data.playerHand;
      } catch (e) {
        return false;
      }
    },
    'blackjack start response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  if (startSuccess && startResponse.status === 200) {
    try {
      const body = JSON.parse(startResponse.body);
      const gameId = body.data.gameId;
      
      // Perform a game action (stand)
      const actionPayload = {
        gameId: gameId,
        action: 'stand',
      };
      
      const actionResponse = http.post(`${BASE_URL}/games/blackjack/action`, JSON.stringify(actionPayload), { headers });
      
      const actionSuccess = check(actionResponse, {
        'blackjack action status is 200': (r) => r.status === 200,
        'blackjack action has result': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.success && body.data && body.data.gameStatus;
          } catch (e) {
            return false;
          }
        },
        'blackjack action response time < 300ms': (r) => r.timings.duration < 300,
      });
      
      if (!actionSuccess) {
        errorRate.add(1);
      }
    } catch (e) {
      errorRate.add(1);
    }
  } else {
    errorRate.add(1);
  }
}



function testUserProfile() {
  if (!authToken) return;
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
  };
  
  const profileResponse = http.get(`${BASE_URL}/user/profile`, { headers });
  
  const profileSuccess = check(profileResponse, {
    'profile status is 200': (r) => r.status === 200,
    'profile has user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.username && typeof body.data.balance === 'number';
      } catch (e) {
        return false;
      }
    },
    'profile response time < 150ms': (r) => r.timings.duration < 150,
  });
  
  if (!profileSuccess) {
    errorRate.add(1);
  }
}

function testGameHistory() {
  if (!authToken) return;
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
  };
  
  const historyResponse = http.get(`${BASE_URL}/user/history?limit=10`, { headers });
  
  const historySuccess = check(historyResponse, {
    'history status is 200': (r) => r.status === 200,
    'history has games array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && Array.isArray(body.data.games);
      } catch (e) {
        return false;
      }
    },
    'history response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  if (!historySuccess) {
    errorRate.add(1);
  }
}

export function teardown(data) {
  // Cleanup if needed
  console.log('Performance test completed');
}