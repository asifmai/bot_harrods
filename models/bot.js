const mongoose = require('mongoose');

// Schema Setup
const botSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
  },
  port: {
    type: Number,
  },
  startDay: {
    type: Number,
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    required: true,
    default: 'IDLE',
  },
  enabled: {
    type: Boolean,
    required: true,
    default: true,
  },
  lastRun: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

botSchema.virtual('address').get(function () {
  return 'http://' + this.ip + ':' + this.port + '/';
});

module.exports = mongoose.model('Bot', botSchema);
