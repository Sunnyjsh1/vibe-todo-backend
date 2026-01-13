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
// URI에 데이터베이스 이름이 없으면 자동으로 추가
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todo';

// URI가 /로 끝나면 데이터베이스 이름 추가
if (MONGODB_URI.endsWith('/')) {
  MONGODB_URI = MONGODB_URI + 'todo';
} else if (!MONGODB_URI.includes('/') || MONGODB_URI.split('/').length < 4) {
  // 데이터베이스 이름이 없는 경우
  if (!MONGODB_URI.endsWith('todo')) {
    MONGODB_URI = MONGODB_URI.endsWith('/') ? MONGODB_URI + 'todo' : MONGODB_URI + '/todo';
  }
}

// MongoDB Atlas URI인 경우 SSL 파라미터 추가
if (MONGODB_URI.includes('mongodb+srv://') || MONGODB_URI.includes('mongodb.net')) {
  // URI에 이미 쿼리 파라미터가 있는지 확인
  const hasParams = MONGODB_URI.includes('?');
  if (!hasParams) {
    MONGODB_URI += '?retryWrites=true&w=majority';
  } else if (!MONGODB_URI.includes('retryWrites')) {
    MONGODB_URI += '&retryWrites=true&w=majority';
  }
}

// MongoDB 연결 옵션
// MongoDB Atlas (mongodb+srv)는 자동으로 SSL/TLS를 사용하므로 별도 설정 불필요
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // 30초 타임아웃 (Heroku에서 더 긴 시간 필요)
  socketTimeoutMS: 45000,
  // 연결 풀 설정
  maxPoolSize: 10,
  minPoolSize: 1
};

// MongoDB 연결 함수 (재시도 로직 포함)
async function connectMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log('✅ MongoDB 연결성공');
    if (process.env.NODE_ENV !== 'production') {
      console.log(`연결 URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
    }
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error.message);
    if (error.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' || error.message.includes('SSL')) {
      console.error('⚠️  SSL/TLS 연결 에러 발생');
      console.error('⚠️  MongoDB Atlas 네트워크 설정을 확인하세요:');
      console.error('   1. Network Access에서 0.0.0.0/0 추가 (모든 IP 허용)');
      console.error('   2. Database Access에서 사용자 권한 확인');
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('연결 URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
      console.error('에러 코드:', error.code);
      console.error('전체 에러:', error);
    }
    console.error('⚠️  서버는 계속 실행되지만 MongoDB 연결이 필요합니다.');
    console.error('⚠️  10초 후 재시도합니다...');
    
    // 10초 후 재시도
    setTimeout(() => {
      console.log('🔄 MongoDB 연결 재시도 중...');
      connectMongoDB();
    }, 10000);
  }
}

connectMongoDB();

// MongoDB 연결 이벤트 리스너
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB 연결됨');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB 연결 에러:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB 연결 끊김');
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

// /todos 경로를 /api/todos로 리다이렉트 (호환성을 위해)
app.get('/todos', (req, res) => {
  res.redirect('/api/todos');
});

app.post('/todos', (req, res) => {
  // POST 요청은 직접 처리할 수 없으므로 404 대신 안내 메시지
  res.status(404).json({
    error: 'Not Found',
    message: 'Please use /api/todos endpoint',
    correctEndpoint: '/api/todos'
  });
});

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

// 서버 시작
// Heroku에서는 process.env.PORT를 반드시 사용해야 함
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📍 Local URL: http://localhost:${PORT}`);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    // Heroku가 아닌 경우에만 다른 포트 시도
    if (process.env.NODE_ENV !== 'production' && !process.env.PORT) {
      console.log(`🔄 Trying port ${PORT + 1}...`);
      const newServer = app.listen(PORT + 1, () => {
        console.log(`✅ Server is running on http://localhost:${PORT + 1}`);
      });
      newServer.on('error', (err) => {
        console.error('❌ Server error:', err);
        process.exit(1);
      });
    } else {
      console.error('❌ Could not start server. Port is in use.');
      process.exit(1);
    }
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});
