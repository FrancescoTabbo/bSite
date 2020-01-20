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
const session = require("express-session");
const ONE_HOUR = 60 *60 * 1000;

const {
    NODE_ENV = 'development',
    SESS_NAME = 'sid',
    SESS_LIFETIME = ONE_HOUR,
    SESSION_SECRET = 'ciao1234'
} = process.env

const IN_PROD = NODE_ENV === "production";

//middleware
//app.set('trust proxy', 1);
app.set('views', './views');
app.set('view engine', 'pug');
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser()); 
app.use(methodOverride('_method')); 
app.use(session({
  name: SESS_NAME, // cookie name dictates the key name added to the request object
  resave: false,
  saveUninitialized: false,
  secret: SESSION_SECRET, // should be a large unguessable string
  cookie: {
    maxAge: SESS_LIFETIME,
    ephemeral: false, // when true, cookie expires when the browser closes
    httpOnly: true, // when true, cookie is not accessible from javascript
    secure: 'auto'
    // when true, cookie will only be sent over SSL. use key 'secureProxy' instead if you handle SSL not in your node process
  }
}));
app.use((req,res,next) =>{
    const {userId} = req.session;
    console.log(/*"user id " + userId.id + */" session " + req.session.id + "userid session " + req.session.userId)
    if(userId){
        console.log("controllo userId riuscito inizio contorllo db sql")
        const conn = mysql.createConnection({
            host: "remotemysql.com",
            user: "W1Y2U1WmcR",
            password: "r9SaoTN3hk",
            database: "W1Y2U1WmcR"
        });
        conn.connect(function(err) {
            if (err) throw err;
            console.log("sql Connected!");
            conn.query("select * from User where id = ?",
            [
                userId.userId
            ],
            function(errr, result, fields) {
              if (errr) throw errr;
              if (result.length != 0) {
                console.log("id user result " + result[0].id)
                res.locals.user= result;
              }
            });
        });
    }
    next();
});

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
const ObjectId = require('mongodb').ObjectId; 
const dbName = 'test';

const uri = "mongodb+srv://admin:Admin1234@francesco-i5qce.mongodb.net/test?retryWrites=true&w=majority";
//{useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true }
const conn = mongoose.createConnection(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

let gfs;

conn.once("open", () => {
  console.log("inizializzazione gfs")
  // init stream
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads"
  });
  console.log("gfs creato! "+ gfs)
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

const redirectLogin = (req, res, next) => {
  console.log(req.session)
  console.log(req.session.userId)
  console.log("redirect fa: " + req.session.userId)
    if(!req.session.userId){
      console.log("redirect login")
        res.render('login', {msg: "effettua il login!"});
    } else{
      
        next();
    }
}
const redirectIndex = (req, res, next) => {
    if(req.session.userId){
      console.log("redirect index")
        res.render('index', {err: "esegui il logout!"});
    } else{
      
        next();
    }
}

app.get('/', redirectLogin, function(req, res) {
  console.log("gfs == " + gfs)
  console.log("userId == " + req.session.userId)
    console.log("/preso")
  const { user } = res.locals; 
  console.log(req.session)
  console.log(res.locals)
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
            file.contentType === "image/gif"
          ) {
            file.isImage = true;
          } else {
            file.isImage = false;
          }
          console.log(file);
          return file;
        })
        .sort((a, b) => {
          return (
            new Date(b["uploadDate"]).getTime() -
            new Date(a["uploadDate"]).getTime()
          );
        });

      return res.render("index", {
        files: f, msg:"Ciao "
      });
    }
  });
});

app.post('/login', redirectIndex, function(req, res) {
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
  conn.connect(function(err) {
    console.log("due");
    if (err) throw err;
    console.log("login..Connected!");
    conn.query("select * from User where nome = ? AND password = ?",
      [
        nickname,
        password
      ],
      function(errr, result, fields) {
        if (errr) throw errr;
        console.log("tre");
        console.log(req.body);
        if (result.length != 0) {
          console.log("quattro");
          console.log(result);
          console.log(result[0].id);
          req.session.userId = result[0].id;
          console.log(req.session.userId);
          return res.redirect('/');
        } else {
          return res.render('login',{msg:"nome o password sbagliato/i!"});
        }
      });
  });
});

/*app.post('/register', redirectIndex, function(req, res) {
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
    console.log("register..Connected!");
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
});*/

app.get('/file/:filename', redirectLogin, function(req, res){
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
});

app.post('/send', redirectLogin, upload.single('file'), function(req, res){
  console.log(req.file.filename);
  res.redirect('/');
});

app.get("/files", redirectLogin, (req, res) => {
  gfs.find().toArray((err, files) => {
    // check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "no files exist"
      });
    }
    return res.json(files);
  });
});

app.post("/files/download/:name", redirectLogin, (req, res) => {
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
});

app.get("/files/:filename", redirectLogin,(req, res) => {
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
});

app.get('/fileType/:filename', redirectLogin, function(req,res){
    var type = req.params.filename;
    var ciao = type.substring(32);
    console.log(type + " ciao: " + ciao);
    if(ciao == ".xml" || ciao == ".XML" )
    {
        console.log("1 xml");
        res.download("images/Xml.png");
    }
    if(ciao == ".bat" || ciao == ".BAT"){
        console.log("1 bat");
        res.download("images/bat.ico");
    }
    if(ciao == ".csv" || ciao == ".CSV"){
        console.log("1 csv");
        res.download("images/Csv.png");
    }
    if(ciao == ".docx" || ciao == ".DOCX"){
        console.log("1 doc");
        res.download("images/Doc.png");
    }
    if(ciao == ".xlsx" || ciao == ".XLSX"){
        console.log("1 Excel");
        res.download("images/Excel.png");
    }
    if(ciao == ".exe" || ciao == ".EXE" || ciao == ".jar" || ciao == ".JAR"){
        console.log("1 exe o jar");
        res.download("images/Exe.png");
    }
    if(ciao == ".pdf" || ciao == ".PDF"){
        console.log("1 pdf");
        res.download("images/Pdf.png");
    }
    if(ciao == ".rar" || ciao == ".RAR"){
        console.log("1 rar");
        res.download("images/rar.png");
    }
    if(ciao == ".txt" || ciao == ".TXT"){
        console.log("1 txt");
        res.download("images/Txt.png");
    }
    if(ciao == ".mp4" || ciao == ".MP4" || ciao == ".avi" || ciao == ".AVI" || ciao == ".ogg" || ciao == ".OGG"){
        console.log("1 video");
        res.download("images/Video.png");
    }
    if(ciao == ".zip" || ciao == ".ZIP"){
        console.log("1 zip");
        res.download("images/Zip.png");
    }
});

app.get("/image/:filename", redirectLogin, (req, res) => {
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
});

// files/del/:id
// Delete chunks from the db
app.post("/files/del/:id", redirectLogin,(req, res) => {
    gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
      if (err) return res.status(404).json({ err: err.message });
      res.redirect("/");
    });
});

app.post('/reload', function(req,res){
  res.redirect('/');
});

app.post('/logout', redirectLogin, function(req, res){
  req.session.destroy(err => {
      if (err){
          return res.redirect('/index');
      }
      res.clearCookie(SESS_NAME).render('login', {msg:"Logout effettuato"});
  });
});

app.set('port', process.env.PORT || 3000);

const server = app.listen(app.get('port'), function() {
    debug('Express server listening on port ' + server.address().port);
});