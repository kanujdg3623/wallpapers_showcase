var express= require("express");
var bodyParser=require("body-parser");
var mongoose=require("mongoose");
var flash=require("connect-flash");
var passport=require("passport");
var LocalStrategy=require("passport-local");
var methodOverride=require("method-override");
var games	=require("./models/games");
var Comment=require("./models/comment");
var User=require("./models/user");
var app=express();
require('dotenv').config()
var commentRoutes=require("./routes/comments"),
	gamesRoutes=require("./routes/games"),
	indexRoutes=require("./routes/index");

mongoose.connect("mongodb://localhost/localgames",{ useNewUrlParser: true });
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname+"/public"));
app.use(methodOverride("_method"));
app.use(flash());

app.use(require("express-session")({
	secret:"This is secret line",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(async function(req,res,next){
	res.locals.currentUser=req.user;
	if(req.user){
		try{
			let user=await User.findById(req.user._id).populate('notifications',null,{isRead: false}).exec();
			res.locals.notifications=user.notifications.reverse();
		}catch(err){
			 console.log(err.message);
		}
	}
	res.locals.error=req.flash("error");
	res.locals.success=req.flash("success");
	next();
});
app.use(indexRoutes);
app.use("/games",gamesRoutes);
app.use("/games/:id/comments",commentRoutes);
app.get("*",function(req,res){
	res.send("PAGE NOT FOUND");
});

app.listen(process.env.PORT,process.env.HOST,function(){
	console.log("Server is listening!!!");
});
