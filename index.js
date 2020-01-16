const debug = require('debug');
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const md5 =require('md5');
const multer = require('multer');
const mongoose = require('mongoose');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('method-override');
const crypto = require('crypto');
const methodOverride = require('method-override');
const MongoClient = require('mongodb').MongoClient;
const Grids = require('gridfs-stream');
const app = express();

//middleware
app.set('views', './views');
app.set('view engine', 'pug');
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
const ObjectId = require('mongodb').ObjectId; 
const dbName = 'test';

/*app.use(function(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept");
    next();
});*/

/*app.use(function(req, res, next) { //allow cross origin requests
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Credentials", true);
    next();
});*/

//app.use('/', routes);
//app.use('/users', users);

const uri = "mongodb+srv://admin:Admin1234@francesco-i5qce.mongodb.net/test?retryWrites=true&w=majority";
//{useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true }
const conn = mongoose.createConnection(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let gfs;

conn.once("open", () => {
  // init stream
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads"
  });
});

const storage = new GridFsStorage({
  url: uri,
  
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      console.log("due");
      crypto.randomBytes(16, (err, buf) => {
        console.log("tre");
        if (err) {
          return reject(err);
          console.log("errorrrerererere")
        }
        const filename = buf.toString("hex") + path.extname
        (file.originalname);
        const originalFilename = file.originalname;
        console.log(file.originalname);
        console.log("quattro");
        const fileInfo = {
          filename: filename,
          metadata: {original : originalFilename},
          bucketName: "uploads"
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({
  storage
});

const params = {
  '/single': 'file',
  '/multiple': 'files'
};

app.get('/', function(req, res) {
  var ver = req.cookies['nome'];
  if(ver){
    if(!gfs) {
    console.log("some error occured, check connection to db");
    res.send("some error occured, check connection to db");
    process.exit(0);
  }
  gfs.find().toArray((err, files) => {
    // check if files
    if (!files || files.length === 0) {
      return res.render("index", {
        files: false
      });
    } else {
      const f = files
        .map(file => {
          if (
            file.contentType === "image/png" ||
            file.contentType === "image/jpeg" ||
            file.contentType === "image/jpg" ||
            file.contentType === "image/gif"
          ) {
            file.isImage = true;
          } else {
            file.isImage = false;
          }
          if (
            file.contentType === "video/mp4" ||
            file.contentType === "video/avi" ||
            file.contentType === "video/ogg"
          ) {
            file.isVideo = true;
          } else {
            file.isImage = false;
          }
          if (
            file.contentType === "text/plain"
          ) {
            file.isText = true;
          } else {
            file.isText = false;
          }
          if (
            file.contentType === "application/x-zip-compressed" ||
            file.contentType === "application/x-7z-compressed" ||
            file.contentType === "application/zip"
          ) {
            file.isZip = true;
          } else {
            file.isZip = false;
          }
          if (
            file.contentType === "application/x-msdownload"
          ) {
            file.isExe = true;
          } else {
            file.isExe = false;
          }
          if (
            file.contentType === "application/vnd.ms-excel" ||
            file.contentType === "video/avi" ||
            file.contentType === "video/ogg"
          ) {
            file.isCsv = true;
          } else {
            file.isCsv = false;
          }
          if (
            file.contentType === "application/octet-stream"
          ) {
            file.isBat = true;
          } else {
            file.isBat = false;
          }
          if (
            file.contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          ) {
            file.isDocx = true;
          } else {
            file.isDocx = false;
          }
          if (
            file.contentType === "application/msword"
          ) {
            file.isWord = true;
          } else {
            file.isWord = false;
          }
          if (
            file.contentType === "application/pdf"
          ) {
            file.isPdf = true;
          } else {
            file.isPdf = false;
          }
          if (
            file.contentType === "application/x-rar-compressed"
          ) {
            file.isRar = true;
          } else {
            file.isRar = false;
          } 
          if (
            file.contentType === "application/vnd.ms-excel" ||
            file.contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          ) {
            file.isExcel = true;
          } else {
            file.isExcel = false;
          }
          if (
            file.contentType === "application/xml" ||
            file.contentType === "text/xml"
          ) {
            file.isXml = true;
          } else {
            file.isXml = false;
          }   
          return file;
        })
        .sort((a, b) => {
          return (
            new Date(b["uploadDate"]).getTime() -
            new Date(a["uploadDate"]).getTime()
          );
        });

      return res.render("index", {
        files: f, msg:"Ciao " + ver
      });
    }
    // return res.json(files);
  });
    //res.render('index',{msg:"Bentornato "+ ver});
  }else{
    res.render('login');
  }
});

app.post('/login', function(req, res) {
  var ver = req.cookies['nome'];
  console.log(ver);
  if(ver){
    res.redirect('/');
  }else{
  console.log("uno");
  console.log(req.body);
  const conn = mysql.createConnection({
    host: "remotemysql.com",
    user: "W1Y2U1WmcR",
    password: "r9SaoTN3hk",
    database: "W1Y2U1WmcR"
  });
  const nickname = req.body.nickname;
  const password = md5(req.body.password+
  ")@Mpk=2!?b>!DRXf\g>{,YI/t.h]@-||%°<#Bri']^o_€+L}9;3GWx?/7&Vh.T5qx£#:(*");
  const perm = 
  conn.connect(function(err) {
    console.log("due");
    if (err) throw err;
    console.log("Connected!");
    conn.query("select * from User where nome = ? AND password = ?",
      [
        nickname,
        password
      ],
      function(errr, result, fields) {
        if (errr) throw errr;
        console.log("tre");
        console.log(req.body);
        console.log(req.query);
        if (result.length != 0) {
          console.log("quattro");
          console.log();
          res.cookie('nome', nickname, { maxAge: 900000, httpOnly: true, sameSite: true, secure:true });
          res.cookie('per', result[0].perm, {maxAge: 900000, httpOnly: true, sameSite: true, secure:true}).redirect('/');
          
        } else {
          res.render('login',{msg:"nome o password sbagliato/i!"});
        }
      });
  });
  }
});

app.post('/register', function(req, res) {
  console.log("uno");
  console.log(req.body);
  const conn = mysql.createConnection({
    host: "remotemysql.com",
    user: "W1Y2U1WmcR",
    password: "r9SaoTN3hk",
    database: "W1Y2U1WmcR"
  });
  const nickname = req.body.nickname;
  const password = req.body.password;
  const newpassword = md5(password +
  ")@Mpk=2!?b>!DRXf\g>{,YI/t.h]@-||%°<#Bri']^o_€+L}9;3GWx?/7&Vh.T5qx£#:(*");

  conn.connect(function(err) {
    console.log("due");
    if (err) throw err;
    console.log("Connected!");
    conn.query("INSERT INTO User(nome,password) VALUES(? ,?)",
    [
      nickname,
      newpassword
    ],
     function(errr, result, fields) {
      if (errr) throw errr;
      console.log("tre");
      console.log(req.body);
      console.log(req.query);
      if (result.length != 0) {
        //res.send({ message: "OK", ID: result });
        res.render('login',{msg:"Effettua il login!"});
      } else {
        res.send({ message: "errore!" });
      }
    });
  });
});

app.get('/file/:filename', function(req, res){
  var ver = req.cookies['nome'];
  if(ver){
      console.log(gfs);
        /** First check if file exists */
        gfs.find({filename: req.params.filename}).toArray(function(err, files){
          if(!files || files.length === 0){
              return res.status(404).json({
                  responseCode: 1,
                  responseMessage: "error"
              });
          }
          if (files.length > 0) {
            
            console.log(gfs);
            var readstream = gfs.createReadStream({
                filename: files[0].filename,
                root: "ctFiles"
            });
            /** set the proper content type */
            res.set('Content-Type', files[0].contentType)
            /** return response */
            return readstream.pipe(res);
          } else {
            res.json('File Not Found');
          }
    });
  }else{
    res.render('login',{msg:"Effettua il login!"})
  }
});

app.post('/send',upload.single('file'),function(req, res){
  var ver = req.cookies['nome'];
  if(ver){
  console.log(req.file.filename);
  //res.json({file:req.file});
  res.redirect('/');
  }else{
    res.render('login',{msg:"Effettua il login!"})
  }
});

app.get("/files", (req, res) => {
  var ver = req.cookies['nome'];
  if(ver){

  gfs.find().toArray((err, files) => {
    // check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "no files exist"
      });
    }
    return res.json(files);
  });
  }else{
    res.render('login',{msg:"Effettua il login!"})
  }
});

app.post("/files/download/:name", (req, res) => {
  var ver = req.cookies['nome'];
  if(ver){
  var we = req.params.name;
  console.log(we);
  const file = gfs
    .find({
      filename: we
    })
    .toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: "no files exist"
        });
      }
      res.set('Content-Type', files[0].contentType);
      res.set('Content-Disposition', 'attachment; filename="' + files[0].metadata.original + '"');
      gfs.openDownloadStreamByName(files[0].filename).pipe(res);
    });
    }else{
    res.render('login',{msg:"Effettua il login!"})
  }
});

app.get("/files/:filename", (req, res) => {
  var ver = req.cookies['nome'];
  if(ver){
  console.log("richiesta");
  const file = gfs
  .find(
    {
      filename: req.params.filename
    }).toArray((err, files) => {
      console.log(" file trovato");
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: "no files exist"
        });
      }

      //gridfs = Grid(conn.db, mongo);

    // write file
    writeStream = gfs.createWriteStream(files.filename);
    fs.createReadStream(files.filename).pipe(writeStream);

    // after the write is finished
    writeStream.on("close", function () {
        // read file, buffering data as we go
        readStream = gridfs.createReadStream(files.filename);

        readStream.on("data", function (chunk) {
            buffer += chunk;
        });

        // dump contents to console when complete
        readStream.on("end", function () {
            console.log("contents of file:\n\n", buffer);
        });
    });
    });
    }else{
    res.render('login',{msg:"Effettua il login!"})
  }
});

app.get("/image/:filename", (req, res) => {
  var ver = req.cookies['nome'];
  if(ver){
  // console.log('id', req.params.id)
  const file = gfs
    .find({
      filename: req.params.filename
    })
    .toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: "no files exist"
        });
      }
      gfs.openDownloadStreamByName(req.params.filename).pipe(res);
    });
  }else{
    res.render('login',{msg:"Effettua il login!"})
  }
});



// files/del/:id
// Delete chunks from the db
app.post("/files/del/:id", (req, res) => {
  var ver = req.cookies['nome'];
  if(ver){
    gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
      if (err) return res.status(404).json({ err: err.message });
      res.redirect("/");
    });
  }else{
    res.render('login',{msg:"Effettua il login!"})
  }
});


/*app.post("/files/download/:id", (req, res) => {
  console.log(req.params.id);
  gfs.find(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
      console.log("uno"); 
      if (err) {
          return res.status(400).send(err);
      }
      else if (!file) {
          return res.status(404).send('Error on the database looking for the file.');
      }
      if(file.metadata.original){
        console.log(file.metadata.original);
      }else{
        console.log("errore metadata");
      }
      
      res.set('Content-Type', file.contentType);
      res.set('Content-Disposition', 'attachment; filename="' + file.metadata.original + '"');

      var readstream = gfs.createReadStream({
        _id: req.params.id,
        root: 'resume'
      });

      readstream.on("error", function(err) { 
          console.log("errore readstream");
          res.end();
      });
      readstream.pipe(res);
    });
});*/

app.post('/reload', function(req,res){
  res.redirect('/');
});

app.get('/logout',function(req, res){
  res.cookie('nome', '',{ maxAge: 0, httpOnly: true , secure : true});
  res.cookie('per', '', { maxAge: 0, httpOnly: true , secure : true}).render('login', {msg:"Logout effettuato"});
});

app.set('port', process.env.PORT || 3000);

const server = app.listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port);
});