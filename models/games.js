var mongoose= require("mongoose");
var gamesSchema=new mongoose.Schema({
	name:String,
	image:String,
	imageId:String,
	desc: String,
	author:{
		id:{
			type:mongoose.Schema.Types.ObjectId,
			ref:"User"
		},
		username:String
	},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment"
		}
	]
});
module.exports=mongoose.model("games",gamesSchema);
