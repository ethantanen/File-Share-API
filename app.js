const express = require('express')
const fs = require('fs')
const grid = require('gridfs-stream')
const mongo = require('mongodb')
const upload = require('multer')({dest:'upload/'})
const path = require('path')
const logger = require('morgan')

// create app, set view engine and begin server
app = express()
app.set('view engine', 'ejs')
app.use(logger('tiny'))
app.listen(3000, () => {
  console.log("listening on port 3000")
})

// connect to mongo database
const URI = 'mongodb://' + process.env.USERNAME + ':' + process.env.PASSWORD + '@ds245240.mlab.com:45240/file-api'
mongo.MongoClient.connect(URI, async (err, db) => {
  if (err) return console.log(err)
  gfs = grid(db,mongo)
  console.log('connected to db')
})

// render main view
app.get('/', (req, res) => {
  res.render('index.ejs')
})

// upload file submitted in multipart form
app.post('/upload',upload.single('file'), (req, res) => {

  // block .exe and .app files
  invalid_extensions = ['app',]
  console.log(path.extname(req.file.originalname))
  if(invalid_extensions.includes(path.extname(req.file.originalname))) {
    res.status(406, "Invalid file format. Potential illegal content.")
  }

  // create read stream from file
  loc = path.join(__dirname,req.file.path)
  readStream = fs.createReadStream(loc)

  // create write stream to db w/ tags as aliases
  writeStream = gfs.createWriteStream({
    filename: req.file.originalname,
    aliases: req.body.tags.split(',').map(x => x.trim()),
  })

  // pipe file to database and render homepage
  readStream.pipe(writeStream)
  res.redirect('/')
})

//download file by id
app.get('/download/id', (req, res, next) => {
  id = req.query.id
  res.attachment('file')
  gfs.createReadStream({_id: id}).pipe(res)
})

// download file by name
app.get('/download/name', (req, res, next) => {
  name = req.query.name
  res.attachment(name)
  gfs.createReadStream({filename: name}).pipe(res)
})

// delete file by id
app.get('/delete/id', (req, res, next) =>{
  id = req.query.id
  gfs.remove({_id:id}, (err, gridStore) => {
    res.redirect('/')
  })
})

// delete file by name
app.get('/delete/name', (req, res, next) => {
  name = req.query.name
  gfs.remove({filename: name}, () => {
    res.redirect('/')
  })
})

// find file
app.get('/find', (req, res) => {
  query = {}

  // update query object, split at commas, remove whitespace and in the case of _id convert to mongo ObjectId
  if(req.query._id) query._id = {$in: req.query._id.split(',').map(x => x.trim()).map(x => mongo.ObjectId(x))}
  if(req.query.filename) query.filename = {$in: req.query.filename.split(',').map(x => x.trim())}
  if(req.query.aliases) query.aliases = {$in: req.query.aliases.split(',').map(x => x.trim())}

  // query databse and return json
  gfs.files.find(query).toArray((err,files) => {
    res.json(files)
  })
})

// render error view
app.use((err, req, res, next) => {
  console.log("ERROR", err)
  res.render('error.ejs',{error: err })
})
