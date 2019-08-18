//importing database models games and comment
var games=require("../models/games");
var Comment=require("../models/comment");

//creating middleware empty array
var middlewareObj={};

//creating element for middlewareObj to check game ownership
middlewareObj.checkGameOwnership=function(req,res,next){
	if(req.isAuthenticated()){
		games.findById(req.params.id,function(err,foundGame){
		if(err) res.redirect("back");
		else{
			if(foundGame.author.id.equals(req.user._id) || req.user.isAdmin){
				next();
			}else{
				req.flash("error","you don't have permission");
				res.redirect("back");
			}
		}
	});
	}else{
		req.flash("error","You need to be logged in");
		res.redirect("back");
	}
}

//creating element for middlewareObj to check comment ownership
middlewareObj.checkCommentOwnership=function(req,res,next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id,function(err,foundComment){
		if(err){
			req.flash("error","Comment not found");
			res.redirect("back");
		}
		else{
			if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){
				next();
			}else{
				req.flash("error","you don't have permission");
				res.redirect("back");
			}
		}
	});
	}else{
		req.flash("error","You need to be logged in");
		res.redirect("back");
	}
}

//creating element for middlewareObj to check if logged in or not
middlewareObj.isLoggedIn=function(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	
	req.flash("error","You are not logged in!");
	res.redirect("/login");
}

//exporting module middlewareObj
module.exports=middlewareObj