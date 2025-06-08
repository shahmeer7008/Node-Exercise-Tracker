const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

// Middleware
app.use(cors())
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// Database Connection
mongoose.connect('mongodb://localhost:27017/FreeCodeCamp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err))

// Schema and Model
const personSchema = new mongoose.Schema({
  username: { type: String, required: true},
  count: { type: Number, default: 0 },
  log: [{
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: String, required: true }
  }]
})

const Person = mongoose.model('Person', personSchema)

// API Endpoints
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body
    if (!username) {
      return res.status(400).json({ error: 'Username is required' })
    }

    const newPerson = new Person({ username })
    const savedPerson = await newPerson.save()
    res.json({ username: savedPerson.username, _id: savedPerson._id })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' })
    }
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await Person.find({}, 'username _id').lean(); // Add .lean() to get plain JS objects
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params
    let { description, duration, date } = req.body

    // Validation
    if (!description || !duration) {
      return res.status(400).json({ error: 'Description and duration are required' })
    }

    duration = parseInt(duration)
    if (isNaN(duration)) {
      return res.status(400).json({ error: 'Duration must be a number' })
    }

    date = date ? new Date(date) : new Date()
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' })
    }

    const user = await Person.findById(_id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const exercise = {
      description,
      duration,
      date: date.toDateString()
    }

    user.log.push(exercise)
    user.count = user.log.length
    await user.save()

    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date,
      duration: exercise.duration,
      description: exercise.description
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const user = await Person.findById(req.params._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let log = [...user.log];

    // Filter by date range
    if (from) {
      const fromDate = new Date(from);
      log = log.filter(ex => new Date(ex.date) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      log = log.filter(ex => new Date(ex.date) <= toDate);
    }

    // Apply limit
    if (limit) {
      log = log.slice(0, parseInt(limit));
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: new Date(ex.date).toDateString() // Ensure consistent dateString format
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})