const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
var nodemailer = require('nodemailer');
const checkAuth = require('./middleware/check-auth');
var generator = require('generate-password');
const async = require('async');
const session = require('express-session');
var thumbler = require('video-thumb');
var flash = require('express-flash');
// const ejs = require('ejs');
// const flash = require('flash');
// var flash = require('express-flash-messages')

var { Artisan } = require('./models/Artisans');
var { Head } = require('./models/Head');
var { Employees } = require('./models/Employees');
var { Scheme } = require('./models/Schemes');
var { Notifications } = require('./models/Notification');
var { Queries } = require('./models/Query')
const app = express();

//add ejs
app.set('view engine', 'ejs');

//sessions setup
var sess = {
  secret: 'keyboard cat',
  cookie: {}
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess));

app.use(express.static(path.join(__dirname,'public')));

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './public/uploads');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const FileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|mp4|pdf)$/)) {
    return cb(new Error('You can upload images,pdf and .mp4 videos'), false);
  }
  cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: FileFilter });


mongoose.connect('mongodb://localhost:27017/Protsahan');
var port = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});

//Routes Created by Harshit

app.get('/', (req, res) => {
  // res.sendFile(__dirname + "/views/index.html");
  res.render('index');
});



app.get('/scheme',(req, res) =>{
  res.render('scheme');
})

app.get('/profile', (req, res) => {
   if(typeof req.session.user === 'undefined'){
     return res.redirect('/');
   }

  if (req.query.message === 'user_created') {
    res.render('profile', { message: 'User created succesfully!' });
  }
  else if (req.query.message === 'user_deleted') {
    res.render('profile', { new_message: 'User deleted succesfully!' });
  }

  else res.render('profile');
  // else  res.sendFile(__dirname + '/views/profile.html');
});

app.get('/dashboard', (req, res) => {
  //console.log('-----------------fdhfdhfkdfk-------------',req.session);
  if(typeof req.session.user === 'undefined'){
    return res.redirect('/');
  }
  res.render('dashboard', { req, res });
});



app.get('/updatepassword', (req, res) => {
  res.render('updatepassword');
});

app.get('/employee', (req, res) => {
  res.render('employee');
});

app.get('/adminlogin/removeuser', (req, res) => {
  res.render('removeuser');
});

app.get('/adminlogin/updatepassword', (req,res) => {
  res.render('updatepasswordadmin');
});

app.post("/adminlogin", (req, res) => {
    Head.find({ username: req.body.username, password: req.body.password}, function(err, user){
    //  console.log(user);
      if(err || !user.length){
          // res.sendFile(__dirname + '/views/error.html');
          // return res.redirect('/');

          res.render('index', { error_message: 'invaild login' });
      }
       else{
         req.session.user=user;
          return res.redirect('profile');
       };
    })
});

app.post("/employeelogin", (req, res) => {
    Employees.find({ username: req.body.username, password: req.body.password}, function(err, user){
      //console.log(user);
      if(err){
         //console.log(err);
          res.status(500).send({
           message:err
         });
       }
      else if(user.length < 1) {
        // res.status(404).send({
        //   message:'User not found'
        // });
        res.render('index', { error_message: 'invaild login' });
       }
       else{
       //  res.status(200).send({
       //   message:'Succesfully logged in'
       // });
       //console.log(user);
       req.session.user = user;
       return res.redirect('dashboard');
     };
    })
});

app.get('/allusers', (req, res) => {
  //console.log(req.session.user[0].state)
  Employees.find({},
    (err, users) => {
      if(users === null)
       console.log('no user found');
      else
        res.render('allusers', { req, res, users });
    }
  );
})

app.get('/allnotifications', (req, res) => {
  //console.log(req.session.user[0].state)
  Notifications.find({status:"false"},
    (err, notes) => {
      if(notes === null)
       console.log('no user found');
      else
        res.render('allnotifications', { req, res, notes });
    }
  );
})

app.post('/adminlogin/adduser', async(req, res) => {
  async.waterfall([
    function(done) {
      var employee = new Employees({
         email: req.body.email,
         username :req.body.username,
         department: req.body.department,
         password : generator.generate({
        length: 6,
        numbers: true
        })
      });
      employee.save(function(err) {
        // res.json({message:'Successfully created'});
        done(err,employee);
      })
    },
    function(employee, done) {
        var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'harshit.jain17071996@gmail.com',
          pass: '17July1996'
        }
      });
      var mailOptions = {
        from: 'harshit.jain17071996@gmail.com',
        to: employee.email,
        subject: 'Mail from Agency',
        text: `username:${employee.username}
               password:${employee.password}`
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          //console.log('email sent');
          res.redirect('/profile?message=user_created');
        }
      });
    }


  ],function(err) {
    if(err) return next(err);
  });
});

app.post("/adminlogin/removeuser", (req, res) => {
    Employees.findOneAndRemove({ email: req.body.email}, function(err,user){
      //console.log(user);
      if(err || user == null){
        res.render('removeuser', { error_message: 'invalid user' });
       }
       else{
       //  res.status(200).send({
       //   message:'Succesfully logged in'
       // });

          res.redirect('/profile?message=user_deleted');
     };
    })
});

app.post("/employeelogin/updatepassword", (req, res) => {
  Employees.findOneAndUpdate({password: req.body.oldpassword}, {$set:{password:req.body.newpassword}},function(err, doc){
      if(doc === null){
          res.render('updatepassword', { error_message: 'invaild login' });
      }
      else{
       res.redirect('/dashboard');
      }
  });
});

app.post("/adminlogin/updatepassword" ,(req, res) => {
  Head.findOneAndUpdate({password:req.body.oldpassword}, {$set:{password:req.body.newpassword}},function(err,doc){
    if(doc === null){
      res.render('updatepasswordadmin',{ error_message: 'invalid login' });
    }
    else{
      res.render('profile');
    }
  })
})

app.post('/employeelogin/addscheme', (req, res) => {
   var schemes = new Scheme ({
     schemename:req.body.schemename,
     description:req.body.description
   });
   schemes.save()
   .then(result => {
     res.redirect('/scheme');
   })
   .catch(e => {
       res.render('scheme', { error_message: 'invalid user' });

   });
});

app.get('/dashboard/artisans', (req, res) => {
  //console.log(req.session.user[0].state)
  Artisan.find({ state: req.session.user[0].state },
    (err, artisans) => {
      if(err === null)
        res.render('artisans', { req, res, artisans });
    }
  );
})

app.get('/dashboard/artisans/all', (req, res) => {
  console.log(req.session.user[0].state)
  Artisan.find({},
    (err, artisans) => {
      if(err === null)
        res.render('artisans_all', { req, res, artisans });
    }
  );
})

app.get('/dashboard/artisan/profile', (req, res) => {
  console.log(req.session.user[0].state)
  console.log(req.query.id)
  Artisan.findOne({ _id: req.query.id },
    (err, artisan) => {
      console.log(artisan)
      if(err === null)
        res.render('artisan_profile', { req, res, artisan });
    }
  );
})

app.get('/dashboard/artisans/qalist', (req, res) => {
  console.log(req.session.user[0].state)
  Queries.find({},
    (err, questions) => {
      if(err === null)
        res.render('QAlist', { req, res, questions });
    }
  );
})

app.get('/dashboard/artisan/question', (req, res) => {
  console.log(req.session.user[0].state)
  console.log(req.query.id)
  Queries.findOne({ _id: req.query.id },
    (err, question) => {
      console.log(question)
      if(err === null)
        res.render('Question', { req, res, question });
    }
  );
})

app.post('/dashboard/answer',(req,res) => {
  Queries.findOneAndUpdate({_id:req.body.id},{$set:{answer:req.body.answer,status:"true"}}, function(err, doc)  {
    if(doc == null){
      res.render('Question');
    }
    else{
      var notification = new Notifications ({
        title:"Answered",
        description:"It is an query",
        typ:"for_users",
        status:"true",
        timestamp:Date.now()
      })
      notification.save()
      .then(result => {
        //send FCM notification
      })
      .catch(e => {
       console.log(e);
      });
    }
  });
});

app.get('/logout',(req,res) => {
   req.session=null;
   res.redirect('/index');
});


// app.get('/dashboard/videos', (req, res) => {
//   console.log(req.session.user[0].state)
//   Video.find({ state: req.session.user[0].state },
//     (err, artisans) => {
//       if(err === null)
//         res.render('artisans', { req, res, artisans });
//     }
//   );
// })
app.get('/api/notifications',(req, res) =>{
  Notifications.find({}, function(err,notes) {
    if(err){
     return res.status(409).json({
       message:err
     });
   }
      res.status(200).send(notes);
  });
});

app.post('/api/query',(req, res) => {
  var query = new Queries ({
    artisan_id:req.body.artisan_id,
    query:req.body.query,
    status:"false",
    timestamp:Date.now()
  })
  query.save()
  .then(result =>{
    var notification = new Notifications ({
      title:"New question has been asked",
      description:result.body.query,
      typ:"for_Dashboard",
      status:"false",
      timestamp:Date.now()
      })
      notification.save()
      .then(result => {
        res.status(200).json({
          message:"Success"
        });
      })
        .catch(e => {
          res.status(409).json({
            messsage:e
          });
      });
    })
    .catch(e => {
      res.status(409).json({
        message:e
      });
    });
})

//Routes Created by Ankit
app.post('/api/artisans', (req, res) => {
  Artisan.find({ username: req.body.username })
    .exec()
    .then(user => {
      if (user.length >= 1) {
        return res.status(409).json({
          message: 'Mail exists'
        });
      } else {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);

        var artisan = new Artisan({
          username: req.body.username,
          password: hash,
        });

        artisan
          .save()
          .then(result => {
            console.log(result);
            res.status(201).json({
              message: 'User Created'
            });
          })
          .catch(err => {
            console.log(err);
            res.status(500).json({
              error: err
            });
          });
      }
    });
});

app.post('/api/artisans/login', (req, res, next) => {
  console.log(req.body);
  Artisan.find({ username: req.body.username })
    .exec()
    .then(user => {
      if (user.length < 1) {
        return res.status(404).json({
          message: 'soth Failed',
          success: false
        });
      }
      bcrypt.compare(req.body.password, user[0].password, (err, result) => {
        if (err) {
          return res.status(401).json({
            message: 'Auth Failed',
            success: false
          });
        }
        if (result) {
          const token = jwt.sign(
            {
              username: user[0].username,
              userId: user[0]._id
            },
            process.env.JWT_KEY,
            {
              expiresIn: '5h'
            }
          );
          return res.status(200).json({
            message: 'Auth Successful',
            success: true,
            token: token,
            username: user[0].username
          });
        }
        res.status(401).json({
          message: 'Auth Failed',
          success: false
        });
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: err
      });
    });
});

app.post('/api/artisans/fcmtoken',(req,res,next)=>{
  Artisan.findOneAndUpdate({username:username},{fcmtoken:req.body.fcmtoken},{new:true},
    function(err, docs) {
      if (err) return res.send(500, { error: err });
      return res.json({
        message: 'Token saved',
        success: true
      });
    }
  )}
);

app.post('/api/artisans/forgot', (req, res) => {
  async.waterfall(
    [
      function(done) {
        Artisan.findOne({ username: req.body.username }, function(
          err,
          artisan
        ) {
          if (!artisan) {
            return res.json({
              message: 'No account with that email address exists.'
            });
          }
          var username = req.body.username;
          var password = generator.generate({
            length: 6,
            numbers: true
          });
          res.json({ password: password });
          done(err, password, username);
        });
      },
      function(password, username, done) {
        var transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'harshit.jain17071996@gmail.com',
            pass: '17July1996'
          }
        });

        var mailOptions = {
          from: 'harshit.jain17071996@gmail.com',
          to: username,
          subject: 'Sending Email using Node.js',
          text: `New Verificstion Code : ${password}`
        };

        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log('Email sent:');
          }
        });
      }
    ],
    function(err) {
      if (err) return next(err);
    }
  );
});

app.post('/api/artisans/editprofile',checkAuth, (req, res) => {
  console.log(req.body);
  Artisan.findOneAndUpdate(
    { username: req.body.username },
    {
      tribe: req.body.tribe,
      description: req.body.description,
      gender: req.body.gender,
      name:req.body.name,
      address:req.body.address,
      phone:req.body.phone,
      aadharNO:req.body.aadharNO,
      state:req.body.state
    },{new :true},
    function(err, docs) {
      if (err) {
        return res.status(400).json({ message: 'Cannot load the profile' });
      }
      res.send({ docs ,success: true, message: 'Profile saved Successfully' });
    }
  );
});

app.post('/api/artisans/fetchprofile', (req, res, next) => {
  console.log(req.body.username);
  Artisan.findOne({ username: req.body.username },'name description address state tribe aadharNO phone gender profilephoto',
  function(err, docs) {
    if (err) {
      return res.status(400).json({ message: 'Unable to load the profile' });
    }
    res.json({ docs: docs, success: true });
  });
});

app.post(
  '/api/artisans/uploadprofilephoto',
  upload.single('profilephoto'),
  (req, res, next) => {
    const qReplace = (str) => {
      if (str.charAt(0) === '"' && str.charAt(str.length -1) === '"')
        {
            return str.substr(1,str.length -2);
        }
    }
    var url = req.file.path;
    console.log(url);
    Artisan.findOneAndUpdate(
      { username: qReplace(req.body.username) },
      { profilephoto: url },{new :true},
      function(err, docs) {
        if (err) return res.send(500, { error: err });
        return res.json({
          message: 'Profile Photo Uploaded Succesfully',
          success: true
        });
      }
    );
  }
);

// app.post('/api/artisans/fetchindividualprofile',(req,res,next)=>{
//   console.log(req.body.username);
//   Artisan.findOne({username:req.body.username},'name description address state tribe aadharNO phone gender profilephoto',
//   function(err,docs){
//     if (err){
//     return res.status(400).json({message:'Unable to load the profile'});
//   }
//   res.json({docs:docs ,success:true});
//   });
// });
app.post('/api/artisans/fetchimages', (req, res, next) => {
  console.log(req.body.username);
  Artisan.findOne({ username: req.body.username }, 'images', function(err,docs) {
    if (err) {
      return res.status(400).json({ message: 'Cannot load images' });
    }
    console.log(docs);
    res.send(docs);
  });
});

app.post('/api/artisans/fetchvideos', (req, res, next) => {
  Artisan.findOne({ username: req.body.username }, 'videos', function(err,docs) {
    if (err) {
      return res.status(400).json({ message: 'Cannot load videos' });
    }
    console.log(docs);
    res.send(docs);
  });
});

app.post('/api/artisans/fetchpdfs', (req, res, next) => {
  Artisan.findOne({ username: req.body.username }, 'pdfs', function(err,docs) {
    if (err) {
      return res.status(400).json({ message: 'Cannot load pdfs' });
    }
    console.log(docs);
    res.send(docs);
  });
});



app.post('/api/artisans/uploadimages', upload.single('images'), (req, res, next) => {
  const qReplace = (str) => {
    if (str.charAt(0) === '"' && str.charAt(str.length -1) === '"')
      {
          return str.substr(1,str.length -2);
      }
  }
  var url=req.file.path;
  var title=qReplace(req.body.title);
  Artisan.findOneAndUpdate(
    { username: qReplace(req.body.username) },
    { $push: { images: {url,title} } },
    function(err, docs) {
      if (err) return res.send(500, { error: err });
      return res.json({
        message: 'Image Uploaded Succesfully',
        success: true
      });
    }
  );
});

app.post('/api/artisans/uploadvideos', upload.single('videos'), (req, res, next) => {
  // console.log(req.file);
  const qReplace = (str) => {
    if (str.charAt(0) === '"' && str.charAt(str.length -1) === '"')
      {
          return str.substr(1,str.length -2);
      }
  }
console.log(req.body.username);
console.log(qReplace(req.body.username));
var url=req.file.path;
var title=qReplace(req.body.title);
console.log(url);
console.log(qReplace(title));
thumbler.extract(`./${url}`, `./${url}.png`, '00:00:02', '800x600', function(){

    console.log('snapshot saved to snapshot.png (200x125) with a frame at 00:00:02');

});
  Artisan.findOneAndUpdate(
    { username: qReplace(req.body.username) },
    { $push: { videos: {url,title,thumbnail: `${url}.png`} } },
    function(err, docs) {
      if (err) return res.send(500, { error: err });
      return res.json({
        message: 'Video Uploaded Successfully',
        success: true
      });
    }
  );
});

app.post('/api/artisans/uploadpdfs', upload.single('pdfs'), (req, res, next) => {
  const qReplace = (str) => {
    if (str.charAt(0) === '"' && str.charAt(str.length -1) === '"')
      {
          return str.substr(1,str.length -2);
      }
  }
  console.log(req.file);
  var url=req.file.path;
  var title=qReplace(req.body.title);
  Artisan.findOneAndUpdate(
    { username: qReplace(req.body.username) },
    { $push: { pdfs: {url,title} } },
    function(err, docs) {
      if (err) return res.send(500, { error: err });
      return res.json({
        message: 'Pdf File Uploaded Successfully',
        success: true
      });
    }
  );
});

app.post('/api/artisans/deletevideo', (req, res, next) => {
  var username=req.body.username;
  console.log(req.body._id);
  console.log(username);
  Artisan.findOne({username: username}).select()
    .exec(function(err, org) {
      if (err) return res.send({success:false});
      if (!org) return res.send(err);
      org.videos.id(req.body._id).remove();
      org.save(function(err, org) {
        if (err) return res.send(err);
        return res.send({org,success:true});
      });
    });
});

app.post('/api/artisans/deleteimage', (req, res, next) => {
  var username=req.body.username;
  console.log(req.body._id);
  console.log(username);
  Artisan.findOne({username: username}).select()
    .exec(function(err, org) {
      if (err) return res.send({success:false});
      if (!org) return res.send(err);
      org.images.id(req.body._id).remove();
      org.save(function(err, org) {
        if (err) return res.send(err);
        return res.send({org,success:true});
      });
    });
});

app.post('/api/artisans/deletepdf', (req, res, next) => {
  console.log(req.body.url);
  Artisan.findOneAndUpdate(
    { username: req.body.username },
    { $pull: { pdfs:{url:req.body.url,title:req.body.title} } },
    {upsert:true},
    function(err, docs) {
      if (err) {
        return res.send(500, { error: err });
      }
      console.log(typeof docs);
      res.send(docs);
    }
  );
});

app.get('/api/artisans/files', (req, res, next) => {
  Artisan.find({}, 'images videos username profilephoto name', function(err, docs) {
    if (err) return res.send(500, { error: err });
    console.log(docs);
    res.send({docs:docs});
  });
});



app.listen(port, () => {
  console.log(`Started on port ${port}`);
});
