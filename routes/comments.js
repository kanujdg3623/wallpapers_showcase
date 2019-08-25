var express= require("express");
var router= express.Router({mergeParams:true});
var games=require("../models/games");
var Comment=require("../models/comment");
var middleware=require("../middleware");
router.get("/new",middleware.isLoggedIn,function(req,res){
	games.findById(req.params.id,function(err,game){
		if(err) console.log(err);
		else{
			res.render("comments/new",{game:game});
		}
	});
});
router.post("/",middleware.isLoggedIn,function(req,res){
	games.findById(req.params.id,function(err,game){
		if(err){
			console.log(err);
			res.redirect("/games");
		}
		else{
			Comment.create(req.body.comment,function(err,comment){
				if(err){
					req.flash("error","Something went wrong");
					console.log(err);
				}
				else{
					comment.author.id=req.user._id;
					comment.author.username=req.user.username;
					comment.game=req.params.id;
					comment.save();
					game.comments.push(comment);
					game.save();
					req.flash("success","successfully added comment");
					res.redirect("/games/"+game._id);
				}
			});
		}
	});
});
router.get("/:comment_id/edit",middleware.checkCommentOwnership,function(req,res){
	Comment.findById(req.params.comment_id,function(err,foundComment){
		if(err) console.log(err);
		else
			res.render("comments/edit",{game_id:req.params.id,comment:foundComment});
	});
});
router.put("/:comment_id",middleware.checkCommentOwnership,function(req,res){
	Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err,updateComment){
		if(err) res.redirect("back");
		else res.redirect("/games/"+req.params.id);
	});
});
router.delete("/:comment_id",middleware.checkCommentOwnership,function(req,res){
	Comment.findByIdAndRemove(req.params.comment_id,function(err){
		if(err) res.redirect("back");
		else {
			req.flash("success","comment deleted");
			res.redirect("/games/"+req.params.id);
		}
	});
});
module.exports=router;