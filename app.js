const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const path = require('path');
const ps = require('prompt-sync');

const app = express();
const prompt = ps();
app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

const detailsSchema = new mongoose.Schema ({
    customer_id: String,
    account_no: Number,
    account_type: String,
    customer_ph: Number,
    customer_gender: String,
    customer_dob: String,
    customer_address: String,
    account_create_date: String
});

const userSchema = new mongoose.Schema ({
    serial_no: Number,
    customer_name: String,
    customer_email: String,
    customer_balance: Number,
    customer_details: detailsSchema
});

const User = new mongoose.model ('User', userSchema);

mongoose.connect('mongodb://localhost:27017/bankuserDB', {
    useNewUrlParser: true
})
.then(() => console.log("Connected to DB!"))
.catch((error) => console.log(error));

app.get('/home', function(req, res) {
    res.render('home');
});

app.get('/customerlist', function(req, res) {
    User.find({}, (err, response) => {
        res.render('customerlist', {users: response});
    });
});

app.post('/customerlist', function(req, res) {
    User.find({}, (err, response) => {
        res.render('customerlist', {users: response});
    }); 
});

app.post('/customerdetails', function(req, res) {
    const customerEmail = req.body.customerEmail;
    User.findOne({customer_email: customerEmail}, function(err, foundDocument) {
        if(!err){
            res.render('customerdetails', {user: foundDocument});
        }
    });
});

app.post('/transactions', function(req, res) {
    const txnType = req.body.txnType;
    const customerEmail = req.body.customerEmail;

    if(txnType === "add"){
        res.render('addfunds', {customerEmail: customerEmail});
    }

}); 

app.post('/controladdfunds', function(req, res) {
    const addAmount = req.body.addAmount;
    const customerEmail = req.body.customerEmail;
    // console.log(customerEmail);
    // console.log(addAmount);
    
    User.findOne({customer_email: customerEmail }, function(err, foundDocument){
        if(!err){
            let currentBalance = parseInt(foundDocument.customer_balance) + parseInt(addAmount);
            console.log(currentBalance);
            foundDocument.customer_balance = currentBalance;

            User.updateOne({customer_email: customerEmail}, {$set: {customer_balance: currentBalance}}, {upsert : true}, function(err){
                if(!err){
                    // console.log(foundDocument);
                    res.render('customerdetails', {user: foundDocument});
                } else {
                    console.log(err);
                }
            });
        }
    });
});


app.listen(3000, function(){
    console.log("Server started on port 3000");
});