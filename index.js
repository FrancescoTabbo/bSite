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
var server = require('http').createServer(app);
const io = require('socket.io')(server);

/* Configurazione HTTPS:
const fs = require('fs');
const https = require('https');
const hostname = 'sito.com';
const httpsPort = 443;
const httpsOptions = {
  cert: fs.readFileSync('./ssl/certificatoo.crt'),
  ca: fs.readFileSync('./ssl/example.ca-bundle'),
  key: fs.readFile('./ssl/chiave.key')
};

const httpsServer = https.createServer(httpsOptions, app);

httpsServer.listen(httpsPort, hostname);
*/

const {
    NODE_ENV = 'development',
    SESS_NAME = 'sid',
    SESS_LIFETIME = ONE_HOUR,
    SESSION_SECRET = 'ciao1234'
} = process.env

const conn = mysql.createPool({
            host: "remotemysql.com",
            user: "W1Y2U1WmcR",
            password: "r9SaoTN3hk",
            database: "W1Y2U1WmcR"
        });

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
    sameSite: true,
    secure: 'auto'
    // when true, cookie will only be sent over SSL. use key 'secureProxy' instead if you handle SSL not in your node process
  }
}));

//app.enable('trust proxy');

/* CONFIGUARZIONE HTTPS PER RE-INDIRIZZARE DA HTTP A HTTPS
app.use (function (req, res, next) {
  console.log("protocol " + req.protocol)
  console.log("secure " + req.secure)
  console.log("header " + req.headers.host)
  console.log("url " + req.url)
        if (req.secure) {
                // request was via https, so do no special handling
                next();
        } else {
                // request was via http, so redirect to https
                res.redirect('https://' + req.headers.host + req.url);
        }
});
*/

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
const ObjectId = require('mongodb').ObjectId; 
const dbName = 'test';

const uri = "mongodb+srv://admin:Admin1234@francesco-i5qce.mongodb.net/test?retryWrites=true&w=majority";
//{useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true }
const connM = mongoose.createConnection(uri, {
  useUnifiedTopology: true,
  useNewUrlParser: true
});

let gfs;

connM.once("open", () => {
  //console.log("inizializzazione gfs")
  // init stream
  gfs = new mongoose.mongo.GridFSBucket(connM.db, {
    bucketName: "uploads"
  });
  //console.log("gfs creato! "+ gfs)
});

const storage = new GridFsStorage({
  url: uri,
  
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      //console.log("due");
      crypto.randomBytes(16, (err, buf) => {
        //console.log("tre");
        if (err) {
          return reject(err);
          //console.log("errorrrerererere")
        }
        const filename = buf.toString("hex") + path.extname
        (file.originalname);
        const originalFilename = file.originalname;
        //console.log(file.originalname);
        //console.log("quattro");
        console.log("sList:  "+ req.body.sList)
        if(req.body.sList){
          const fileType = req.body.sList;
          const fileInfo = {
            filename: filename,
            metadata: {
              original : originalFilename,
              fileType: fileType
            },
            bucketName: "uploads"
          };
          resolve(fileInfo);
        }else{
          const fileInfo = {
            filename: filename,
            metadata: {original : originalFilename},
            bucketName: "uploads"
          };
          resolve(fileInfo);
        }      
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

// @desc "middleware" di reindirizzamento al login in caso di mancanza di sessionId
const redirectLogin = (req, res, next) => {
  //console.log(req.session)
  //console.log(req.session.userId)
  //console.log("redirect fa: " + req.session.userId)
    if(!req.session.userId){
      //console.log("redirect login")
        res.render('login', {msg: "effettua il login!"});
    } else{
      
        next();
    }
}

// @desc "middleware" di reindirizzamento alla homepage in caso di presenza del sessionId
const redirectIndex = (req, res, next) => {
    if(req.session.userId){
      //console.log("redirect index")
        res.render('index', {err: "esegui il logout!"});
    } else{
      
        next();
    }
}

// @desc "middleware" di controllo session
const check = (req,res,next) =>{
  const {userId} = req.session;
  console.log("hey")
  console.log("user id: "+ userId)

  //console.log("check userID:  " + userId)
  //console.log(/*"user id " + userId.id + */" session " + req.session.id + "userid session " + req.session.userId)
  if(userId){
    console.log(userId)
    console.log("hou")
    //console.log("inizio query")
    conn.getConnection(function (err, connection) {
    console.log("due");
    if (err) throw err;
    console.log("login..Connected!");
      connection.query("select * from User where id = ?",
      [
          userId
      ],
      function(errr, result, fields) {
        connection.release();
        if (errr) throw errr;
        console.log("nome user result " + result[0].nome)
        res.locals.user= result[0];
        console.log("locals name: " + res.locals.user.nome)

        next();
        //console.log("locals:  " + req.locals.user)
      });
    });
  }
  
};


app.get('/', redirectLogin, check, function(req, res){
  console.log('helo')
  const { user } = res.locals;
  res.render('index', {msg = "Ciao "+ user.nome, per:user.perm})
})

// @route get
// @desc upload page
app.get('/upload', redirectLogin, check, function(req, res) {
  const { user } = res.locals;
  //console.log("gfs == " + gfs)
  //console.log("userId == " + req.session.userId)
  //console.log("/preso")
  //const { user } = res.locals; 
  //console.log("session:  " + req.session)
  //console.log("local:  " + req.locals)
  if(user){
    if(!gfs) {
    //console.log("some error occured, check connection to db");
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
          return file;
        })
        .sort((a, b) => {
          return (
            new Date(b["uploadDate"]).getTime() -
            new Date(a["uploadDate"]).getTime()
          );
        });
        console.log(res.user)
        return res.render("upload", {
        files: f, per: user.perm, msg:"Ciao " + user.nome
      });
    }
  });
  }
});

// @route post
// @desc funzione di login
app.post('/login', redirectIndex, function(req, res) {
  console.log("uno");
  console.log(req.body);
  const nickname = req.body.nickname;
  const password = md5(req.body.password+
  ")@Mpk=2!?b>!DRXf\g>{,YI/t.h]@-||%°<#Bri']^o_€+L}9;3GWx?/7&Vh.T5qx£#:(*"); 
  conn.getConnection(function (err, connection) {
    console.log("due");
    if (err) throw err;
    console.log("login..Connected!");
    connection.query("select * from User where nome = ? AND password = ?",
      [
        nickname,
        password
      ],
      function(errr, result, fields) {
        connection.release();
        if (errr) throw errr;
        console.log("tre");
        console.log(req.body);
        if (result.length != 0) {
          console.log("quattro");
          console.log(result[0]);
          console.log(result[0].id);
          req.session.userId = result[0].id;
          /*req.session.userNo = result[0].nome;
          req.session.userPe = result[0].perm;*/
          console.log(req.session.userId);
          return res.redirect('/');
        } else {
          return res.render('login',{msg:"nome o password sbagliato/i!"});
        }
      });
  });
});

// @route get
// @desc  reindirizzamento registrazione nuovi user
app.get('/Rregister', redirectLogin, check, function(req,res){
  const { user } = res.locals;
  if(user.perm==1){
  res.render('register');
  }else{
    res.render('index',{err: "non hai i permessi necessari"})
  }
});

// @route post
// @desc registrazione user
app.post('/register', redirectLogin, function(req, res) {
  //console.log("uno");
  //console.log(req.body);
  const nickname = req.body.nickname;
  const password = req.body.password;
  const newpassword = md5(password +
  ")@Mpk=2!?b>!DRXf\g>{,YI/t.h]@-||%°<#Bri']^o_€+L}9;3GWx?/7&Vh.T5qx£#:(*");

  conn.getConnection(function(err, connection) {
    //console.log("due");
    if (err) throw err;
    //console.log("register..Connected!");
    connection.query("INSERT INTO User(nome,password) VALUES(? ,?)",
    [
      nickname,
      newpassword
    ],
     function(errr, result, fields) {
      connection.release();
      if (errr) throw errr;
      //console.log("tre");
      //console.log(req.body);
      //console.log(req.query);
      if (result.length != 0) {
        //res.send({ message: "OK", ID: result });
        res.render('register', {err:"Account creato!"});
      } else {
        res.render('register', { err: "riprova!" });
      }
    });
  });
});

/*
// @route get
// @desc 
app.get('/file/:filename', redirectLogin, function(req, res){
      //console.log(gfs);
        /** First check if file exists 
        gfs.find({filename: req.params.filename}).toArray(function(err, files){
          if(!files || files.length === 0){
              return res.status(404).json({
                  responseCode: 1,
                  responseMessage: "error"
              });
          }
          if (files.length > 0) {
            
            //console.log(gfs);
            var readstream = gfs.createReadStream({
                filename: files[0].filename,
                root: "ctFiles"
            });
            /** set the proper content type 
            res.set('Content-Type', files[0].contentType)
            /** return response 
            return readstream.pipe(res);
          } else {
            res.json('File Not Found');
          }
    });
});
*/

// @route post
// @desc invio del file al db
app.post('/send', redirectLogin, upload.single('file'), function(req, res){
  console.log("BBBBODY")
  console.log("name: "+req.body.sList)
  //console.log(req.file.filename);
  res.redirect('/');
});

// @route get
// @desc visualizza il json dei file
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

// @route post
// @desc (in uso) download file usando downloadStream
app.post("/files/download/:name", redirectLogin, (req, res) => {
  var we = req.params.name;
  //console.log(we);
  const file = gfs
    .find({
      filename: we
    })
    .toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: "no files exist, riprova o contatta l'amministratore"
        });
      }
      res.set('Content-Type', files[0].contentType);
      res.set('Content-Disposition', 'attachment; filename="' + files[0].metadata.original + '"');
      gfs.openDownloadStreamByName(files[0].filename).pipe(res);
    });
});

// @route get
// @desc query di ricerca file
app.get("/cerca", redirectLogin, check, (req,res) => {
  const ricerca = req.query.ricerca;
  const { user } = res.locals;
  //console.log(ricerca)
  const file = gfs
    .find()
    .toArray((err, files) => {
      // check if files
      //console.log("ricerca files")
    if (!files || files.length === 0) {
      console.log("nessun file trovato")
      return res.render("index", {
        searchR: false , err: "nessun file trovato"
      });
    } else {
      const s = files
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
          if (
            file.metadata.original.match(new RegExp(ricerca,"i")) 
          )
            return file;
        })
        .sort((a, b) => {
          return (
            new Date(b["uploadDate"]).getTime() -
            new Date(a["uploadDate"]).getTime()
          );
        });
        //console.log(s)
        //console.log("inzio loop")
        for(i=0;i>=s.length;i++){
          console.log("s:  "+s[i].metadata.original)
        }
        console.log("lunghezza" + s.length)
        if (s.length === 0){
          console.log("no")
        }else{
          console.log("si")
        }
      return res.render("index", {
        searchR: s, per: user.perm, msg:"Ciao " + user.nome
      });
    }
    });

});

app.get('/guide',redirectLogin, check, (req,res) =>{
  const { user } = res.locals;
  //console.log(ricerca)
  const file = gfs
    .find()
    .toArray((err, files) => {
      // check if files
      //console.log("ricerca files")
    if (!files || files.length === 0) {
      console.log("nessun file trovato")
      return res.render("index", {
        searchR: false , err: "nessun file trovato"
      });
    } else {
      const s = files
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
            return file;
        })
        .sort((a, b) => {
          return (
            new Date(b["uploadDate"]).getTime() -
            new Date(a["uploadDate"]).getTime()
          );
        });
      return res.render("guides", {
        filtro: s, per: user.perm
      });
    }
    });
});

// @route get
// @desc scarica file con readStream
/*app.get("/files/:filename", redirectLogin,(req, res) => {
  //console.log("richiesta");
  const file = gfs
  .find(
    {
      filename: req.params.filename
    }).toArray((err, files) => {
      //console.log(" file trovato");
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
});*/

// @route get
// @desc visualizza i formati con delle immagini
app.get('/fileType/:filename', redirectLogin, function(req,res){
    var type = req.params.filename;
    var ciao = type.substring(32);
    //console.log(type + " ciao: " + ciao);
    if(ciao == ".xml" || ciao == ".XML" )
    {
        //console.log("1 xml");
        res.download("images/Xml.png");
    }
    if(ciao == ".bat" || ciao == ".BAT"){
        //console.log("1 bat");
        res.download("images/bat.ico");
    }
    if(ciao == ".csv" || ciao == ".CSV"){
        //console.log("1 csv");
        res.download("images/Csv.png");
    }
    if(ciao == ".docx" || ciao == ".DOCX"){
        //console.log("1 doc");
        res.download("images/Doc.png");
    }
    if(ciao == ".xlsx" || ciao == ".XLSX"){
        //console.log("1 Excel");
        res.download("images/Excel.png");
    }
    if(ciao == ".exe" || ciao == ".EXE" || ciao == ".jar" || ciao == ".JAR" || ciao == ".Java" || ciao == ".JAVA" || ciao == ".java"){
        //console.log("1 exe o jar");
        res.download("images/Exe.png");
    }
    if(ciao == ".pdf" || ciao == ".PDF"){
        //console.log("1 pdf");
        res.download("images/Pdf.png");
    }
    if(ciao == ".rar" || ciao == ".RAR"){
        //console.log("1 rar");
        res.download("images/rar.png");
    }
    if(ciao == ".txt" || ciao == ".TXT"){
        //console.log("1 txt");
        res.download("images/Txt.png");
    }
    if(ciao == ".mp4" || ciao == ".MP4" || ciao == ".avi" || ciao == ".AVI" || ciao == ".ogg" || ciao == ".OGG"){
        //console.log("1 video");
        res.download("images/Video.png");
    }
    if(ciao == ".zip" || ciao == ".ZIP"){
        //console.log("1 zip");
        res.download("images/Zip.png");
    }
});

// @route get
// @desc visualizza un immagine
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

// @route post files/del/:id
// @desc Delete chunks from the db
app.post("/files/del/:id", redirectLogin,(req, res) => {
    gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
      if (err) return res.status(404).json({ err: err.message });
      res.redirect("/");
    });
});

// @route post 
// @desc ricarica la pagina
app.post('/reload', function(req,res){
  res.redirect('/');
});

// @route post
// @desc funzione di logout
app.post('/logout', redirectLogin, function(req, res){
  req.session.destroy(err => {
      if (err){
          return res.redirect('/index');
      }
      res.clearCookie(SESS_NAME).render('login', {msg:"Logout effettuato"});
  });
});

// @route get
// @desc chat di gruppo

app.get('/chat', redirectLogin, check, function(req,res){
  const { user } = res.locals;
  var numUsers = 0;
  io.on('connection', (socket) => {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
  });
  res.render('chat',{nome:user.nome,per: user.perm})
});

app.set('port', process.env.PORT || 3000);

server.listen(app.get('port'), () => {
  console.log('Server listening at port %d', app.get('port'));
});