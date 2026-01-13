const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Todo = require('../models/Todo');

// 할일 목록 조회 라우터
router.get('/todos', async (req, res) => {
  try {
    // MongoDB 연결 상태 확인
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: '데이터베이스 연결이 없습니다.',
        message: 'MongoDB에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
        dbStatus: mongoose.connection.readyState
      });
    }

    const todos = await Todo.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      message: '할일 목록을 조회했습니다.',
      todos: todos
    });
  } catch (error) {
    console.error('할일 목록 조회 오류:', error);
    
    // 개발 환경에서는 상세한 에러 정보 제공
    const errorResponse = {
      error: '서버 오류가 발생했습니다.',
      message: error.message || '알 수 없는 오류가 발생했습니다.'
    };
    
    // 프로덕션 환경이 아닐 때만 스택 트레이스 포함
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.stack = error.stack;
      errorResponse.details = error;
    }
    
    res.status(500).json(errorResponse);
  }
});

// 할일 생성 라우터
router.post('/todos', async (req, res) => {
  try {
    // MongoDB 연결 상태 확인
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: '데이터베이스 연결이 없습니다.',
        message: 'MongoDB에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
      });
    }

    const { title, description } = req.body;

    // title 필수 검증
    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        error: '제목은 필수입니다.' 
      });
    }

    // 새 할일 생성
    const todo = new Todo({
      title: title.trim(),
      description: description ? description.trim() : ''
    });

    const savedTodo = await todo.save();
    
    res.status(201).json({
      message: '할일이 생성되었습니다.',
      todo: savedTodo
    });
  } catch (error) {
    console.error('할일 생성 오류:', error);
    
    const errorResponse = {
      error: '서버 오류가 발생했습니다.',
      message: error.message || '알 수 없는 오류가 발생했습니다.'
    };
    
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.stack = error.stack;
    }
    
    res.status(500).json(errorResponse);
  }
});

// 할일 수정 라우터
router.put('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    // ID 유효성 검증
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: '유효하지 않은 ID입니다.' 
      });
    }

    // title 필수 검증
    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        error: '제목은 필수입니다.' 
      });
    }

    // 할일 찾기 및 수정
    const todo = await Todo.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        description: description ? description.trim() : ''
      },
      { new: true, runValidators: true }
    );

    // 할일이 존재하지 않는 경우
    if (!todo) {
      return res.status(404).json({ 
        error: '할일을 찾을 수 없습니다.' 
      });
    }

    res.status(200).json({
      message: '할일이 수정되었습니다.',
      todo: todo
    });
  } catch (error) {
    console.error('할일 수정 오류:', error);
    res.status(500).json({ 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 할일 삭제 라우터
router.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ID 유효성 검증
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: '유효하지 않은 ID입니다.' 
      });
    }

    // 할일 찾기 및 삭제
    const todo = await Todo.findByIdAndDelete(id);

    // 할일이 존재하지 않는 경우
    if (!todo) {
      return res.status(404).json({ 
        error: '할일을 찾을 수 없습니다.' 
      });
    }

    res.status(200).json({
      message: '할일이 삭제되었습니다.',
      todo: todo
    });
  } catch (error) {
    console.error('할일 삭제 오류:', error);
    res.status(500).json({ 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;
