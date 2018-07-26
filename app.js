const express = require('express')
const fs = require('fs')
const grid = require('gridfs-stream')
const mongo = require('mongodb')
const upload = require('multer')({dest:'upload/'})
const path = require('path')
const logger = require('morgan')
const https = require('https')

// create app, set view engine and begin server
app = express()
app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/static'))
app.use(logger('dev'))

const PORT = process.env.PORT || 3000

// render main view
app.get('/', (req, res) => {
  res.render('index.ejs')
})

// upload file submitted in multipart form
app.post('/upload',upload.single('file'), (req, res) => {

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
  res.render('index.ejs')
})

//download file by id
app.get('/download/id', (req, res, next) => {
    id = req.query.id
    res.attachment('file')
    gfs.createReadStream({_id: id})
      .on('error', next)
      .pipe(res)
      .on('error', next)
})

// download file by name
app.get('/download/name', (req, res, next) => {
    name = req.query.name
    if(!name) return next(new Error('Input valid file name!'))
    res.attachment(name)
    gfs.createReadStream({filename: name})
      .on('error', next)
      .pipe(res)
      .on('error', next)
})

// delete file by id
app.get('/delete/id', (req, res, next) =>{
  id = req.query.id
  gfs.remove({_id: id}, (err) => {
    if (err) return next(err)
    res.render('index.ejs')
  })
})

// delete file by name
app.get('/delete/name', (req, res, next) => {
  name = req.query.name
  if (!name) return next(new Error('Input valid file name!'))
  gfs.remove({filename: name}, (err) => {
    if (err) return next(err)
    res.render('index.ejs')
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
    if (err) return next(new Error('Invalid query!'))
    res.status(200).json(files)
  })
})

// render error view
app.use((err, req, res, next) => {
  console.log("ERROR", err)
  res.render('error.ejs',{error: err })
})

//begin server
app.listen(PORT, () => {
  console.log("listening on port ",PORT)
})
// begin https server on port 8000
// https.createServer({
//     key: fs.readFileSync('./encryption/server.key'),
//     cert: fs.readFileSync('./encryption/server.cert')
//   }, app)
//   .listen(PORT, (err) => {
//     if (err) return console.log("Can't connect to port ",PORT, err)
//     return console.log("Listening on port ", PORT)
//   })

// connect to mongo database
const URI = 'mongodb://' + process.env.USERNAME + ':' + process.env.PASSWORD + '@ds245240.mlab.com:45240/file-api'
mongo.MongoClient.connect(URI, async (err, db) => {
  if (err) return console.log(err)
  gfs = grid(db,mongo)
  console.log('connected to db')
})
