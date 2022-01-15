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

const customerTxnSchema = new mongoose.Schema({
    date_of_txn : String,
    transferred_from : String,
    transferred_to : String,
    debit_amount : String,
    credit_amount : String,
    balance: String
});

const userSchema = new mongoose.Schema ({
    serial_no: Number,
    customer_name: String,
    customer_email: String,
    customer_id: String,
    account_no: Number,
    customer_balance: Number,
    customer_details: detailsSchema,
    transactions : [customerTxnSchema]
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
    User.findOne({customer_id: customerID}, function(err, foundUser) {
        if(!err){
            res.render('customerdetails', {user: foundUser});
        }
    });
});

app.post('/customers/:id', function(req, res) {
    const customerID = req.params.id;
    User.findOne({customer_id: customerID}, function(err, foundUser) {
        if(!err){
            res.render('customerdetails', {user: foundUser});
        }
    });
});

app.post('/customers/:id/txn', function(req, res) {
    const txnType = req.body.txnType;
    const customerID = req.params.id;

    User.findOne({customer_id: customerID}, function(err, foundUser) {
        if(!err){
            if(txnType === "add"){
                res.render('addfund', {user: foundUser});
            } else if(txnType === "withdraw") {
                res.render('withdrawfund', {user: foundUser});
            } else if(txnType === 'transfer') {
                res.render('transferfund', {user: foundUser});
            } else if(txnType === 'view') {
                res.render('viewtxn', {user:foundUser});
            }
        } 
    });

}); 

app.post('/customers/:id/txn/addfund', function(req, res) {
    const addAmount = req.body.addAmount;
    const customerID = req.params.id;
    
    User.findOne({customer_id: customerID }, function(err, foundUser){
        if(!err){
            let currentBalance = parseInt(foundUser.customer_balance) + parseInt(addAmount);
            // console.log(currentBalance);
            foundUser.customer_balance = currentBalance;

            User.updateOne({customer_id: customerID}, {$set: {"customer_balance": currentBalance}}, {upsert: true}, function(error){
                if(!error){
                    res.redirect(`/customers/${customerID}`);
                    // console.log(foundUser.customer_id);
                } else {
                    console.log(err);
                }           
            });
            const txnDetails = {
                date_of_txn : new Date().toLocaleString(),
                transferred_from : "Self",
                transferred_to : "Self",
                debit_amount : "-",
                credit_amount : `₹${addAmount}`,
                balance : `₹${currentBalance}`
            }
            foundUser.transactions.push(txnDetails);
            foundUser.save();
        }

    });
});


app.post('/customers/:id/txn/withdrawfund', function(req, res) {
    const customerID = req.params.id;
    const withdrawAmount = req.body.withdrawAmount;

    User.findOne({customer_id: customerID}, function(err, foundUser){
        if(!err){
            if(parseInt(foundUser.customer_balance) >= parseInt(withdrawAmount)){
                let currentBalance = parseInt(foundUser.customer_balance) - parseInt(withdrawAmount);
                // console.log(currentBalance);
                foundUser.customer_balance = currentBalance;

                User.updateOne({customer_id: customerID}, {$set: {customer_balance: currentBalance}}, {upsert : true}, function(err){
                    if(!err){
                        res.redirect(`/customers/${customerID}`);
                        // console.log(foundUser.customer_id);
                    } else {
                        console.log(err);
                    }
                });

                const txnDetails = {
                    date_of_txn : new Date().toLocaleString(),
                    transferred_from : "Self",
                    transferred_to : "Self",
                    debit_amount : `₹ ${withdrawAmount}`,
                    credit_amount : "-",
                    balance : `₹ ${currentBalance}`
                }
                foundUser.transactions.push(txnDetails);
                foundUser.save();

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
                                });

                                const txnDetails1 = {
                                    date_of_txn : new Date().toLocaleString(),
                                    transferred_from : "Self",
                                    transferred_to : `${foundUser2.customer_name}`,
                                    debit_amount : `₹ ${transferAmount}`,
                                    credit_amount : "-",
                                    balance : `₹ ${currentBalanceUser1}`
                                }
                                foundUser1.transactions.push(txnDetails1);
                                foundUser1.save();


                                const txnDetails2 = {
                                    date_of_txn : new Date().toLocaleString(),
                                    transferred_from : `${foundUser1.customer_name}`,
                                    transferred_to : "Self",
                                    debit_amount : "-",
                                    credit_amount : `₹ ${transferAmount}`,
                                    balance : `₹ ${currentBalanceUser2}`
                                }
                                foundUser2.transactions.push(txnDetails2);
                                foundUser2.save();

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