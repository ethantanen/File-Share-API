const fs = require('fs');
const mongodb = require('mongodb');
const express = require('express')
const app = express()

// Address of mongodb hosted on mlab.com
const uri = "mongodb://ethantanen:mississippi1@ds139920.mlab.com:39920/api_file_test";

// GridFSBucket object used for communicating with mongodb
var database

// Connect to mongodb
mongodb.MongoClient.connect(uri, (err, client) => {

  // Check for errors
  if(err) return console.log(err)

  // Make database global
  database = new mongodb.GridFSBucket(client)

  // Begin server
  app.listen(3000, () => {
    console.log('\nServer started! --> visit localhost:3000\n')
  })

});


//use /upload/* and remove upload
app.get('/upload/files/*', (req,res) => {


  // Remove upload prefix from file path
  var file_path = "." + req.url.replace("/upload","")

  // Get file name from the end of file_path
  var file_name = file_path.split("/").reverse()[0]

  // Sanity check!
  console.log("Uploading...","\nPath:", file_path, "\nName:", file_name)

  //TODO: first idea for catching wrong files
  fs.readFile(file_path, (err,data) => {
    if(err) return console.log("\nFILE DOESNT EXIST")
  })

  // Upload file to database
  fs.createReadStream(file_path).

    //TODO: "Ethan" will be array of tags, also have option to include content type
    pipe(database.openUploadStream(file_name,{"metadata":"ETHAN"})).

    // Log errors
    on('error', (err)  => {
      if(err) console.log(err)
    }).

    // Log success message
    on('finish', function() {
      console.log(`Success! ${file_name} stored in database`);
    });

    // Redirect back to home page
    res.redirect('/')

})

//TODO: add multiple, delete one/multiple, retrieve one/multiple
