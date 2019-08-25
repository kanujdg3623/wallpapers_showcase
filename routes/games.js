var express= require("express");

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

var router= express.Router();
var games=require("../models/games");
var Comment=require("../models/comment");
var User=require("../models/user");
var Notification=require("../models/notification");
var middleware=require("../middleware");
router.get("/",function(req,res){
	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		games.find({"name": regex},function(err,allGames){
		if(err) console.log(err);
		else {
		res.render("games/index",{games:allGames}); }
	});
	}else{
		games.find({},function(err,allGames){
		if(err) console.log(err);
		else {
		res.render("games/index",{games:allGames.reverse()}); }
	});
	}
});

router.get("/new",middleware.isLoggedIn,function(req,res){
	res.render("games/new");
});
router.post("/",middleware.isLoggedIn,upload.single("image"), async function(req,res){
	let result=await cloudinary.uploader.upload(req.file.path);
	var name=req.body.name;
	var image=result.secure_url;
	var imageId=result.public_id;
	var desc=req.body.desc;
	var author={
			id:req.user._id,
			username:req.user.username
	}
	var newGame={ name: name, image: image, imageId: imageId, desc: desc,author: author};
	try{
		let game=await games.create(newGame);
		let user=await User.findById(req.user._id).populate('followers').exec();
		let newNotification={
			username: req.user.username,
			gameId: game.id
		}
		for(const follower of user.followers){
			let notification=await Notification.create(newNotification);
			follower.notifications.push(notification);
			follower.save();
		}
		res.redirect('/games/'+game._id);
	} catch(err) {
		req.flash('error', err.message);
		res.redirect('back');
	}
});
router.get("/:id",function(req,res){
	games.findById(req.params.id).populate("comments").exec(function(err,foundGame){
		if(foundGame)
			res.render("games/show",{game:foundGame});
		else res.redirect("/*");
	});
});
router.get("/:id/edit",middleware.checkGameOwnership,function(req,res){
	games.findById(req.params.id,function(err,foundGame){
		if(err) console.log(err);
		else
		res.render("games/edit",{game:foundGame});
	});
});
router.put("/:id",middleware.checkGameOwnership,upload.single('image'),function(req,res){
	games.findById(req.params.id,async function(err,game){
		if(err) 
		{
			req.flash("error",err.message);
			res.redirect("/games");
		}
		else {
			if(req.file){
				try{
					await cloudinary.uploader.destroy(game.imageId);
					let result=await cloudinary.uploader.upload(req.file.path);
					game.imageId=result.public_id;
					game.image=result.secure_url;
					}
					catch(err){
						req.flash("error",err.message);
						return res.redirect("/games");
					}
			}
				game.name=req.body.name;
				game.desc=req.body.desc;
				game.save();
				req.flash("success","Successfully Updated!");
				res.redirect("/games/"+req.params.id);
		}
	});
});
router.delete("/:id",middleware.checkGameOwnership,function(req,res){
	games.findById(req.params.id,async function(err,game){
		if(err) {
			req.flash("error",err.message);
			return res.redirect("back");
		}
		try {
			await cloudinary.uploader.destroy(game.imageId);
			game.remove();
			req.flash("success","Game deleted successfully!");
			res.redirect("/games");
		}
		catch(err){
			if(err){
				req.flash("error",err.message);
				return res.redirect("back");
			}
		}
	});
});
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};
module.exports=router;