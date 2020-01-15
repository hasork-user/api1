var express = require("express");
	app = express();
	mongoose = require("mongoose");
	bodyParser = require("body-parser");
	aws = require("aws-sdk");
	multerS3 = require("multer-s3");
	multer = require("multer");
	path = require("path");
	url = require("url");
	methodOverride = require("method-override");
	fs = require("fs");

	mongoose.connect("mongodb+srv://sand123:sand123@cluster0-t0jwv.gcp.mongodb.net/atii1?retryWrites=true&w=majority", { useNewUrlParser: true });

	app.set("view engine", "ejs");
	app.use(bodyParser.urlencoded({extended : true}));
	app.use(methodOverride("_method"));

	var fileSchema = new mongoose.Schema({
		type : String,
		name : String,
		url : String
	});
	var File = mongoose.model("File", fileSchema);

	
	var s3 = new aws.S3({
	secretAccessKey : "",
	accessKeyId : "",
	bucket : 'sandeep970bucket'
	});

	var upload = multer({
		storage : multerS3({
			s3 : s3,
			bucket : 'sandeep970bucket',
			key: function(req, file, cb) {
				cb(null, path.basename( file.originalname, path.extname( file.originalname ) ) + '-' + Date.now() + path.extname( file.originalname ));
			}
		})
	});

	var params = {
		Bucket : 'sandeep970bucket'
	};
		

	app.get("/", function(req,res){
		res.redirect("/upload");
	});

	app.get("/upload", function(req,res){
		res.render("upload");
	});

	app.post('/upload', upload.single('fileUpload'), function(req, res, next){
		var newobj = {type : req.file.mimetype,name : req.file.key,url : req.file.location};
		File.create(newobj, function(err,data){
			if(err){
				console.log(err);
			}else{
				res.redirect("/objects");
			}
		});
	});

	app.get("/objects", function(req,res){
		var allKeys = [];
	
		s3.listObjectsV2(params, function(err, data){
			if(err){
				console.log(err);
			}else{
				var contents = data.Contents;
				contents.forEach(function(content){
					allKeys.push(content.Key);
				});

				if(data.IsTruncated){
					params.ContinuationToken = data.NextContinuationToken;
                	console.log("get further list...");
               	 	listAllKeys();
				}
				res.render("home",{keys:allKeys});
			}
		});
	});

	app.get("/download/object/:id", function(req,res){
		var params = {
			Bucket : 'sandeep970bucket',
			Key : req.params.id
		};
		res.attachment(req.params.id);
		var fileStream = s3.getObject(params).createReadStream();
		fileStream.pipe(res);
	});

	app.get("/show/:id", function(req,res){
		File.find({name:req.params.id}, function(err,file){
			if(err){
				console.log(err);
			}else{
				res.render("show",{file:file});
			}
		});
	});

	app.delete("/object/:id", function(req,res){
		var params = {
			Bucket : 'sandeep970bucket',
			Key : req.params.id
		}
		s3.deleteObject(params, function(err, data){
			if(err){
				console.log(err);
			}else{
				File.findOneAndDelete({name:req.params.id}, function(err){
					if(err){
						console.log(err);
					}else{
						res.redirect("/objects");
					}
				});	
			}
		});
	});

	app.listen(process.env.PORT,process.env.IP, function(){
		console.log("running");
	});