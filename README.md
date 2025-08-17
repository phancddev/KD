# Knowledge Duel Application

A simple web application for quiz competitions with vanilla HTML, CSS, and JavaScript.

## Features

- User authentication (login system)
- Two game modes:
  - Room Battle: Create or join rooms to compete with others
  - Solo Battle: Practice mode with questions

## Project Structure

```
nqd_kd/
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── home.js
│   │   ├── login.js
│   │   ├── room-battle.js
│   │   └── solo-battle.js
│   └── images/
├── views/
│   ├── home.html
│   ├── login.html
│   ├── room-battle.html
│   └── solo-battle.html
├── server.js
├── package.json
└── README.md
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
   
   Or for development with auto-reload:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## How to Use

1. Login with any username and password (no real authentication yet)
2. Choose a game mode:
   - Room Battle: Create a room or join with a room code
   - Solo Battle: Practice by yourself

## Future Improvements

- Backend implementation for real-time room battles
- Database integration for user accounts and questions
- Admin panel for question management
- Score history and leaderboards