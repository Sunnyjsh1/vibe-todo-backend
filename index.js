const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// 라우터 import
const todoRouter = require('./Routers/todoRouter');

const app = express();
const PORT = process.env.PORT || 5000;

// 프론트엔드 폴더 경로 설정
const FRONTEND_PATH = path.join(__dirname, '..', 'todo-firebase');

// Middleware - CORS 설정 (개발 환경에서는 모든 origin 허용)
app.use(cors({
  origin: true, // 모든 origin 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// OPTIONS 요청 명시적 처리
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB 연결
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todo';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB 연결성공');
    console.log(`연결 URI: ${MONGODB_URI}`);
  })
  .catch((error) => {
    console.error('❌ MongoDB 연결 실패:', error.message);
    console.error('연결 URI:', MONGODB_URI);
    // 연결 실패 시 서버 재시작 (3초 후)
    setTimeout(() => {
      console.log('서버를 재시작합니다...');
      process.exit(1);
    }, 3000);
  });

// MongoDB 연결 상태 확인 함수
function getMongoDBStatus() {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',  // 연결 안 됨
    1: 'connected',     // 연결됨
    2: 'connecting',    // 연결 중
    3: 'disconnecting'  // 연결 해제 중
  };
  return {
    state: states[state] || 'unknown',
    readyState: state,
    isConnected: state === 1
  };
}

// ============================================
// API 라우트 (먼저 정의)
// ============================================

// API 상태 확인 라우트
app.get('/api/status', (req, res) => {
  const mongoStatus = getMongoDBStatus();
  res.json({ 
    message: 'Todo Backend API Server',
    status: 'running',
    mongodb: {
      status: mongoStatus.state,
      connected: mongoStatus.isConnected,
      uri: MONGODB_URI.replace(/\/\/.*@/, '//***:***@') // 비밀번호 숨김
    }
  });
});

// API 라우터 사용 (오직 /api/* 경로만 처리)
app.use('/api', todoRouter);

// ============================================
// 프론트엔드 정적 파일 제공
// ============================================

// 프론트엔드 정적 파일 제공 (CSS, JS, 이미지 등)
app.use(express.static(FRONTEND_PATH));

// 루트 경로에서 index.html 제공
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// index.html 직접 요청 처리
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// API 라우터 사용 (오직 /api/* 경로만 처리)
app.use('/api', todoRouter);

// 404 핸들러 - 존재하지 않는 경로에 대한 처리
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'API 엔드포인트를 찾을 수 없습니다.',
    availableEndpoints: {
      'GET /': '서버 상태 확인',
      'GET /api/todos': '할일 목록 조회',
      'POST /api/todos': '할일 생성',
      'PUT /api/todos/:id': '할일 수정',
      'DELETE /api/todos/:id': '할일 삭제'
    },
    note: '이 서버는 API 서버입니다. 프론트엔드는 별도로 실행해야 합니다.'
  });
});

// 서버 시작 함수 (포트 충돌 시 자동으로 다른 포트 사용)
function startServer(port) {
  const server = app.listen(port, () => {
    if (port !== PORT) {
      console.log(`⚠️  Port ${PORT} was in use.`);
    }
    console.log(`✅ Server is running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use.`);
      if (port < PORT + 10) {
        console.log(`🔄 Trying port ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('❌ Could not find an available port. Please close the process using the port.');
        process.exit(1);
      }
    } else {
      console.error('❌ Server error:', error);
      process.exit(1);
    }
  });
}

startServer(PORT);
