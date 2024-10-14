const connectDB = require("../config/db")
const { ObjectId } = require('mongodb')

const dotenv = require('dotenv');
const { default: axios } = require("axios");
dotenv.config();

// const store_id = process.env.SSL_Store_ID
// const store_passwd = process.env.SSL_Store_Password
// const is_live = false //true for live, false for sandbox

const tran_id = new ObjectId().toString()

const order = async (req, res) => {
    try {
        const db = await connectDB()
        const collection = db.collection('vehiclesData')
        const paymentCollection = db.collection('payment')

        const order = req.body
        // console.log("order : ", order)

        const car = await collection.findOne({ _id: new ObjectId(req.body.carId) })
        // console.log("car : ", car?.vehicle_info?.rental_price)

        // price

        const totalCost = order?.totalRentHours * car?.vehicle_info?.rental_price / 24;
        const absoluteTotalCost = Math.ceil(totalCost);

        if (order?.method === 'Self-driving') {

            const initialData = {
                store_id: "gowhe6703a1593988b",
                store_passwd: "gowhe6703a1593988b@ssl",
                total_amount: absoluteTotalCost,
                currency: "BDT",
                tran_id: tran_id, // use unique tran_id for each api call
                success_url: `http://localhost:3000/api/payment/success/${tran_id}`,
                fail_url: `http://localhost:3000/api/payment/fail/${tran_id}`,
                cancel_url: 'http://localhost:3030/cancel',
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                car_name: 'Computer.',
                car_category: 'Electronic',
                car_profile: 'general',
                cus_name: "cus_name",
                cus_email: 'customer@example.com',
                cus_add1: "cus_address",
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: '01711111111',
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
                product_name: "product_name",
                product_category: "product_category",
                product_profile: "product_profile"
            };

            console.log(initialData)

            const response = await axios({
                method: "POST",
                url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
                data: initialData,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            })

            console.log("response : ", response?.data?.GatewayPageURL)
            res.send({ url: response?.data?.GatewayPageURL })

            const finalOrder = {
                car, paidStatus: false, tranjectionId: tran_id,
            }

            const result = paymentCollection.insertOne(finalOrder)

        }
        // else if (order.method === "driver") {

        // }


        // const data = {
        //     total_amount: car?.totalPrice,
        //     currency: "BDT",
        //     tran_id: tran_id, // use unique tran_id for each api call
        //     success_url: `http://localhost:3000/api/payment/success/${tran_id}`,
        //     fail_url: `http://localhost:3000/api/payment/fail/${tran_id}`,
        //     cancel_url: 'http://localhost:3030/cancel',
        //     ipn_url: 'http://localhost:3030/ipn',
        //     shipping_method: 'Courier',
        //     car_name: 'Computer.',
        //     car_category: 'Electronic',
        //     car_profile: 'general',
        //     cus_name: order?.cus_name,
        //     cus_email: 'customer@example.com',
        //     cus_add1: order?.address,
        //     cus_add2: 'Dhaka',
        //     cus_city: 'Dhaka',
        //     cus_state: 'Dhaka',
        //     cus_postcode: '1000',
        //     cus_country: 'Bangladesh',
        //     cus_phone: '01711111111',
        //     cus_fax: '01711111111',
        //     ship_name: 'Customer Name',
        //     ship_add1: 'Dhaka',
        //     ship_add2: 'Dhaka',
        //     ship_city: 'Dhaka',
        //     ship_state: 'Dhaka',
        //     ship_postcode: 1000,
        //     ship_country: 'Bangladesh',
        // };

        // console.log(data)


        // const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
        // sslcz.init(data).then(apiResponse => {
        //     // Redirect the user to payment gateway
        //     let GatewayPageURL = apiResponse.GatewayPageURL
        //     res.send({ url: GatewayPageURL })


        //     const finalOrder = {
        //         car, paidStatus: false, tranjectionId: tran_id, 
        //     }

        //     const result = paymentCollection.insertOne(finalOrder)

        //     console.log("Redirection to : ", GatewayPageURL)

        // });

    }
    catch (error) {
        res.status(500).send('Error payment');
    }
}

const paymentSuccess = async (req, res) => {
    try {
        const db = await connectDB()
        const paymentCollection = db.collection('payment')
        console.log("trajection id : ", req.params.tranId)

        const result = await paymentCollection.updateOne({ tranjectionId: req.params.tranId }, {
            $set: {
                paidStatus: true,
            }
        })
        if (result.modifiedCount > 0) {
            console.log("redirect")
            res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`)
        }

    } catch (error) {
        res.status(500).send('Error payment');
    }
}

const paymentFail = async (req, res) => {
    try {

        const db = await connectDB()
        const paymentCollection = db.collection('payment')

        const result = await paymentCollection.deleteOne({ tranjectionId: req.params.tranId })

        if (result.deletedCount) {
            res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
        }

    } catch (error) {
        res.status(500).send('Error payment');
    }
}

module.exports = { order, paymentSuccess, paymentFail }
