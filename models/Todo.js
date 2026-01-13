const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true // createdAt과 updatedAt 자동 생성
});

const Todo = mongoose.model('Todo', todoSchema);

module.exports = Todo;
