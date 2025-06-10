const mongoose=require("mongoose")

const reviewsSchema=new mongoose.Schema({



})
const REVIEWS=new mongoose.model("reviews",reviewsSchema)
module.exports=REVIEWS;