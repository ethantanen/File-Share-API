const fs = require('fs');
const mongodb = require('mongodb');
const express = require('express')
const formidable = require('formidable')
const app = express()


// Uses environment port if specified and localhost:3000 if not

// Set the view engine in order to render interface
app.set('view engine', 'ejs');

//Middleware?
app.use(express.static('/views'));

// Address of mongodb hosted on mlab.com
const uri = "mongodb://ethantanen:mississippi1@ds245240.mlab.com:45240/file-api";

// GridFSBucket object used for communicating with mongodb
var database

// Connect to mongodb
mongodb.MongoClient.connect(uri, (err, db) => {
  // Check for errors
  if(err) return console.log(err)
  // Make database global
  database = new mongodb.GridFSBucket(db)
  // Create folder for storing files temporaroly


  /*
  console.log("HERE")
  if(!fs.existsSync(dir)){
    console.log("HERE")
    fs.mkdirSync(dir)
  }*/


  // Begin Server
  var PORT = process.env.PORT || 3000

  app.listen(PORT, () => {
    console.log('\nServer started! --> visit localhost:' + PORT  + "\n")
  })
});



// Display form
app.get('/', (req,res) => {
  var lists = []

  files = database.find({})

  files.on('data', (chunk) => {
    lists.push([chunk.filename,chunk.uploadDate,chunk._id])
  })

  files.on('end', () => {
    res.render('index.ejs',{list:lists})
  })

})


// Download file by id
app.post('/download/id', (req,res) => {

  var form = new formidable.IncomingForm()

  form.parse(req, (err,fields) => {

    console.log(fields)



    dir = "/tmp"
    console.log("DIR NAME:" , __dirname + dir)

    if(!fs.existsSync(__dirname + dir)){
      console.log("DIR CREATED")
      fs.mkdirSync(dir)
    }

    database.openDownloadStream(mongodb.ObjectId(fields.id)).pipe(fs.createWriteStream(__dirname + "/tmp/" + fields.name)).
    on('finish', () => {


      console.log("SOME WRITING WENT DOWN")
      console.log(fs.existsSync("app/tmp/"+fields.name))


      res.redirect('/')

    })

  })
})

// Delete file by id
app.post('/delete/id', (req,res) => {
  var form = new formidable.IncomingForm()

  form.parse(req, (err, fields) => {
    database.delete(mongodb.ObjectId(fields.id), ()=>{res.redirect('/')})
  })
})


// Download file by name to current directory
app.get('/find/name', (req,res) => {

  file_name = req.query.name
  var file = database.openDownloadStreamByName(file_name).pipe(fs.createWriteStream("./"+file_name))

  res.redirect('/')

})

//



// Upload file
app.post('/upload', (req,res) => {

  var form = new formidable.IncomingForm();

  // Parse form
  form.parse(req, function(err, fields, file) {

    // Check for errors
    if(err || file.file.name == "") return console.log("\nFile does not exists")

    // Saucy print statement
    console.log("\nUploading...","\nPath:",__dirname + file.file.path,"\nName:",file.file.name)


    // Upload file to database
    fs.createReadStream(file.file.path).

    pipe(database.openUploadStream(file.file.name,{"metadata":fields.tags})).

    // Log errors
    on('error', (err)  => {
      if(err) console.log(err)
    }).
    // Log success message
    on('finish', function() {
      console.log(`Success! ${file.file.name} stored in database`);
      res.redirect('/')
    });
  });
})






//TODO: add multiple, delete one/multiple, retrieve one/multiple, update entries tags
