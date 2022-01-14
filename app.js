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
    customer_id: String,
    account_no: Number,
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

app.get('/customers', function(req, res) {
    User.find({}, (err, response) => {
        res.render('customerlist', {users: response});
    });
});

app.post('/customers', function(req, res) {
    User.find({}, (err, response) => {
        res.render('customerlist', {users: response});
    });
});

app.get('/customers/:id', function(req, res) {
    const customerID = req.params.id;

    // console.log(customerID);
    User.findOne({customer_id: customerID}, function(err, foundDocument) {
        if(!err){
            res.render('customerdetails', {user: foundDocument});
        }
    });
});

app.post('/customers/:id', function(req, res) {
    const customerID = req.params.id;
    User.findOne({customer_id: customerID}, function(err, foundDocument) {
        if(!err){
            res.render('customerdetails', {user: foundDocument});
        }
    });
});

app.post('/customers/:id/txn', function(req, res) {
    const txnType = req.body.txnType;
    const customerID = req.params.id;

    User.findOne({customer_id: customerID}, function(err, foundDocument) {
        if(!err){
            if(txnType === "add"){
                res.render('addfund', {user: foundDocument});
            } else if(txnType === "withdraw") {
                res.render('withdrawfund', {user: foundDocument});
            } else if(txnType === 'transfer') {
                res.render('transferfund', {user: foundDocument});
            }
        } 
    });

}); 

app.post('/customers/:id/txn/addfund', function(req, res) {
    const addAmount = req.body.addAmount;
    const customerID = req.params.id;
    
    User.findOne({customer_id: customerID }, function(err, foundDocument){
        if(!err){
            let currentBalance = parseInt(foundDocument.customer_balance) + parseInt(addAmount);
            // console.log(currentBalance);
            foundDocument.customer_balance = currentBalance;

            User.updateOne({customer_id: customerID}, {$set: {customer_balance: currentBalance}}, {upsert : true}, function(err){
                if(!err){
                    res.redirect(`/customers/${customerID}`);
                    // console.log(foundDocument.customer_id);
                } else {
                    console.log(err);
                }
            });
        }
    });
});


app.post('/customers/:id/txn/withdrawfund', function(req, res) {
    const customerID = req.params.id;
    const withdrawAmount = req.body.withdrawAmount;

    User.findOne({customer_id: customerID}, function(err, foundDocument){
        if(!err){
            if(parseInt(foundDocument.customer_balance) >= parseInt(withdrawAmount)){
                let currentBalance = parseInt(foundDocument.customer_balance) - parseInt(withdrawAmount);
                // console.log(currentBalance);
                foundDocument.customer_balance = currentBalance;

                User.updateOne({customer_id: customerID}, {$set: {customer_balance: currentBalance}}, {upsert : true}, function(err){
                    if(!err){
                        res.redirect(`/customers/${customerID}`);
                        // console.log(foundDocument.customer_id);
                    } else {
                        console.log(err);
                    }
                });
            } else {
                res.send("<h1>Your Account doesn't hold that much ammount!</h1>");
            }
        }
    });
});


app.post('/customers/:id/txn/transferfund', function(req, res) {
    const customerID = req.params.id;
    const recepientAccNo = req.body.recepientAccNo;
    const transferAmount = req.body.transferAmount;

    User.findOne({customer_id: customerID}, function(err, foundUser1){
        if(!err){
            if(parseInt(foundUser1.customer_balance) >= parseInt(transferAmount)){
                let currentBalanceUser1 = parseInt(foundUser1.customer_balance) - parseInt(transferAmount);
                foundUser1.customer_balance = currentBalanceUser1;

                User.updateOne({customer_id: customerID}, {$set: {customer_balance: currentBalanceUser1}}, {upsert : true}, function(err){
                    if(!err){
                        User.findOne({account_no: recepientAccNo}, function(err, foundUser2) {
                            if(!err){
                                let currentBalanceUser2 = parseInt(foundUser2.customer_balance) + parseInt(transferAmount);
                                foundUser2.customer_balance = currentBalanceUser2;

                                User.updateOne({account_no: recepientAccNo}, {$set: {customer_balance: currentBalanceUser2}}, {upsert: true}, function(error){
                                    if(!error){
                                        res.redirect(`/customers/${customerID}`);
                                    } else {
                                        console.log(error);
                                    }
                                })
                            } else {
                                console.log(err);
                            }
                        })
                    } else {
                        console.log(err);
                    }
                });
            } else {
                res.send("<h1>Your Account doesn't hold that much ammount!</h1>");
            }
        }
    })
})


app.listen(3000, function(){
    console.log("Server started on port 3000");
});