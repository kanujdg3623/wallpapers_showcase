var express= require("express");
var router= express.Router();
var passport=require("passport");
var User=require("../models/user");
var middleware=require("../middleware");
var Notification=require("../models/notification");
var games=require("../models/games");
var async= require("async");
var nodemailer=require("nodemailer");
var crypto= require("crypto");
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary').v2;
cloudinary.config({ 
  cloud_name: 'dzjusemr6', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});
router.get("/",function(req,res){
	res.render("landing");
});

router.get("/register",function(req,res){
	res.render("register");
});
router.post("/register",upload.single("avatar"),async function(req,res){
	var newUser=new User({
		username:req.body.username,
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email,
		avatar: req.body.avatar
	});
	try{
		if(req.file)
			{
				let result=await cloudinary.uploader.upload(req.file.path);
				newUser.avatar=result.secure_url;
			}
		let user=await User.register(newUser,req.body.password);
		await passport.authenticate("local");
		req.flash("success","Welcome to Games. Please login to continue... "+user.username);
		res.redirect("/games");
	}
	catch(err){
		req.flash("error",err.message);
		return res.render("register");
	}
});

router.get("/login",function(req,res){
	res.render("login");
});
router.post("/login",passport.authenticate("local",{
	successRedirect: "/games",
	failureRedirect: '/login',
	failureFlash: "Invalid username or password."
}),function(req,res){
});
router.get("/logout",function(req,res){
	req.logout();
	req.flash("success","Logged you out!");
	res.redirect("/games");
});

router.get("/forgot",function(req,res){
	res.render("forgot");
});

router.post("/forgot",function(req,res,next){
	async.waterfall([
		function(done){
			crypto.randomBytes(20,function(err,buf){
				var token=buf.toString('hex');
				done(err,token);
			});
		},
		function(token,done){
			User.findOne({email:req.body.email},function(err,user){
				if(!user){
					req.flash("error","No account with that email address exists.");
					return res.redirect("/forgot");
				}
				user.resetPasswordToken=token;
				user.resetPasswordExpires=Date.now()+3600000;
				user.save(function(err){
					done(err,token,user);
				});
			});
		},
		function(token,user,done){
			var smtpTransport=nodemailer.createTransport({
				service:'Gmail',
				auth:{
					user:"kanujdg2@gmail.com",
					pass: process.env.GMAILPW
				}
			});
			var mailOptions={
				to:user.email,
				from: 'kanujdg2@gmail',
				subject:'Node.js Password Reset',
				text:"You are receiving this because you (or someone else) have requested the reset of the password "+
				"Please click on the following link or paste this into your browser to complete the process "+
				"http://"+req.headers.host+"/reset/"+token+"\n\n"+
				"If you did not requrest this, please ignore this email and your password will remain unchanged"
			};
			smtpTransport.sendMail(mailOptions,function(err){
				console.log("mail sent");
				req.flash("success","An email has been sent to "+user.email+" with further instrunctions.");
				done(err,'done');
			});
		}
		],function(err){
			if(err) return next(err);
			res.redirect("/forgot");
		});
});

router.get('/reset/:token',function(req,res){
	User.findOne({resetPasswordToken:req.params.token, resetPasswordExpires:{$gt: Date.now()}},function(err,user){
		if(!user){
			req.flash('error','Password reset token is invalid or has expired.');
			return res.redirect('/forgot');
		}
		res.render('reset',{token:req.params.token});
	});
});

router.post('/reset/:token',function(req,res){
	async.waterfall([
		function(done){
			User.findOne({resetPasswordToken:req.params.token,resetPasswordExpires:{$gt:Date.now()}},function(err,user){
				if(!user){
					req.flash('error','Password reset token is invalid or has expired.');
					return res.redirect('back');
				}
				if(req.body.password===req.body.confirm){
					user.setPassword(req.body.password,function(err){
						user.resetPasswordToken=undefined;
						user.resetPasswordExpires=undefined;
						user.save(function(err){
							req.logIn(user,function(err){
								done(err,user);
							});
						});
					})
				}else{
					req.flash("error","passwords do not match.");
					return res.redirect("back");
				}
			});
		},
		function(user,done){
			var smtpTransport=nodemailer.createTransport({
				service: 'Gmail',
				auth:{
					user:'kanujdg2@gmail',
					pass:process.env.GMAILPW
				}
			});
			var mailOptions={
				to:user.email,
				from:'kanujdg2@gmail',
				subject:'Your password has been changed',
				text: 'Hello,\n\n'+
				'This is a confirmation that the password for your account '+user.email+'has just been changed'
			};
			smtpTransport.sendMail(mailOptions,function(err){
				req.flash('success','Success! Your password has been changed.');
				done(err);
			});
		}
		], function(err){
			res.redirect('/games');
		});
});

router.get('/users/:id',async function(req,res){
	try{
		let user=await User.findById(req.params.id).populate('followers').exec();
		let Games=await games.find().where('author.id').equals(user._id);
		res.render('profile',{user:user, game:Games});
	}catch(err){
		req.flash('error',err.message);
		return res.redirect('back');
	}
});

router.get('/follow/:id',middleware.isLoggedIn,async function(req,res){
	try{
		if(String(req.user._id)==String(req.params.id)) throw "User can't follow itself";
		let user=await User.findById(req.params.id);
		if(user.followers.some(function(follower){ return follower.equals(req.user._id)})) throw "Already followed the user";
		user.followers.push(req.user._id);
		user.save();
		req.flash('success','Successfully followed'+user.username+'!');
		res.redirect('/users/'+req.params.id);
	}catch(err){
		req.flash('error',err.message?err.message:err);
		res.redirect('/games');
	}
});

router.get('/notifications',middleware.isLoggedIn,async function(req,res){
	try{
		let user=await User.findById(req.user._id).populate({
			path:'notifications',
			options:{sort:{"_id":-1}}
		}).exec();
		let allNotifications=user.notifications;
		res.render('notifications/index',{allNotifications});
	}catch(err){
		req.flash('error',err.message);
		res.redirect('back');
	}
});

router.get('/notifications/:id',middleware.isLoggedIn,async function(req,res){
	try{
		let notification=await Notification.findById(req.params.id);
		notification.isRead=true;
		notification.save();
		res.redirect('/games/'+notification.gameId);
	}catch(err){
		req.flash('error',err.message);
		res.redirect('back');
	}
});
router.get('/isRead',middleware.isLoggedIn,async function(req,res){
	try{
		let user=await User.findById(req.user._id).populate({
		path:'notifications'}).exec();
		user.notifications.forEach(async function(notification){
			let notify=await Notification.findById(notification._id);
			notify.isRead=true;
			notify.save();
		});
		res.redirect('/games/');
	}catch(err){
		req.flash('error',err.message);
		res.redirect('back');
	}
});
module.exports=router;