const adminModel = require("../model/adminModel")
const userModel = require("../model/userModel")
const mongoose=require("mongoose")



const { ObjectId } = require('mongoose').Types;

const Category = require("../model/productModel").category;
const { category } = require("../model/productModel");

const Order = require("../model/orderModel")
const Coupon = require("../model/couponModel")
const Product = require('../model/productModel').product;

const bcrypt=require('bcrypt');
const { name } = require('ejs');
const path=require("path")

const securePassword = async (password) => {
  try {
      const passwordHash = await bcrypt.hash(password, 10);
      return passwordHash;
  } catch (error) {
      console.log(error.message);
  }
};

const loginLoad=async(req,res)=>{
    try {
        res.render('login')
    } catch (error) {
        console.log(error.message )
    }
}
const adminLogout=async(req,res)=>{
  try {
      req.session.destroy()
      res.redirect('/admin')
  } catch (error) {
      console.log(error.message)
  }
}
const verifyLogin=async(req,res)=>{
  try{
      const email=req.body.email
      const password=req.body.password

      const adminData=await adminModel.findOne({email:email})
      if(adminData){
          const passwordMatch=await bcrypt.compare(password,adminData.password)
          if (passwordMatch) {
              if (adminData.is_admin===0) {
                  res.render('login',{message:"Email and password is incorrect"})
              } else {
                  req.session.admin_id=adminData._id
                  res.redirect('/admin/dashboard')
              } 
          } else {
              res.render('login',{message:"Email and password is incorrect"})
          }
      }
      else{
          res.render('login',{message:"Email and password is incorrect"})
      }
  }
  catch(error){
     console.log(error.message)
  }
}


const usersLoad = async (req, res) => {
  try {
    const { search } = req.query;

    // Pagination settings
    const page = req.query.page || 1;
    const limit = 5;

    // Calculate skip value based on page and limit
    const skip = (page - 1) * limit;

    let users;

    if (search) {
      // Fetch users with search and pagination
      users = await userModel
        .find({ username: { $regex: '.*' + search + '.*', $options: 'i' } })
        .skip(skip)
        .limit(limit);
    } else {
      // Fetch all users with pagination
      users = await userModel.find().skip(skip).limit(limit);
    }

    // Get total count of users (for calculating totalPages)
    const totalCount = await userModel.countDocuments();

    res.render('customers', {
      userss: users,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
      search: search, // Add search to your render data
    });
  } catch (error) {
    console.log(error);
  }
};



const blockOrNot = async (req, res) => {
  try {
    const id = req.body.id;
    const userData = await userModel.findOne({ _id: id });

    // Check if the user is currently logged in (session exists)
    if (req.session && req.session.user_id && req.session.user_id.toString() === id.toString()) {
      // Clear the session to log out the user
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
      });
    } 

    // Update the is_verified status
    if (userData.is_verified === true) {
      await userModel.updateOne(
        { _id: id },
        { $set: { is_verified: false } }
      );
    } else {
      await userModel.updateOne({ _id: id }, { $set: { is_verified: true } });
    }

    res.redirect("/admin/customers");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
  

  

  
  const categoryLoad = async (req, res) => {
    try {
      const search = req.query.search || ''; // Get search query from request parameters
      const page = parseInt(req.query.page) || 1; // Get page number from request parameters, default to 1
      const limit = 5; // Set the number of items per page
  
      let categories;
      let count;
  
      if (search) {
        categories = await Category.find({
          $or: [
            { category_name: { $regex: '.*' + search + '.*', $options: 'i' } },
            { category_description: { $regex: '.*' + search + '.*', $options: 'i' } },
          ],
        })
          .skip((page - 1) * limit)
          .limit(limit);
  
        count = await Category.find({
          $or: [
            { category_name: { $regex: '.*' + search + '.*', $options: 'i' } },
            { category_description: { $regex: '.*' + search + '.*', $options: 'i' } },
          ],
        }).countDocuments();
      } else {
        categories = await Category.find({})
          .skip((page - 1) * limit)
          .limit(limit);
  
        count = await Category.countDocuments({});
      }
  
      const totalPages = Math.ceil(count / limit);
  
      res.render("categories", {
        categories: categories,
        search: search,
        currentPage: page,
        totalPages: totalPages,
      }); // Pass search query and pagination details to the template
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error");
    }
  };
  

  const unlistCategory = async (req, res) => {
    try {
      const id = req.body.id; // Use req.body to get the category ID from the form submission
      const category = await Category.findById(id);
  
      if (category) {
        category.is_listed = !category.is_listed;
        await category.save();
      }
  
      const categories = await Category.find({});
      res.redirect("/admin/categories");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error"); // Handle the error appropriately
    }
  };
  


  const addcategoryLoad = async (req, res) => {
    try {
      res.render("addcategories");
    } catch (error) {
      console.log(error);
    }
  };


 

const addCategory = async (req, res) => {
  try {
      console.log(req.body);

      // Convert the category name to lowercase for case-insensitive comparison
      const categoryName = req.body.category_name.toLowerCase();

      // Check if a category with the same name already exists (case-insensitive)
      const existingCategory = await Category.findOne({
          category_name: { $regex: new RegExp(`^${categoryName}$`, 'i') }
      });

      if (existingCategory) {
          return res.render('addcategories', { message: "Category Already Created" });
      }

      let category = await new Category({
          category_name: req.body.category_name,  // Save the original case
          category_description: req.body.category_description,
          is_listed: true,
      });

      let result = await category.save();
      console.log(result);
      res.redirect("/admin/categories");
  } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error");
  }
};


const editCategoryLoad = async (req, res) => {
  try {
    const categoryId = req.query.id;
    const categoryDetails = await Category.find({ _id: categoryId });
    console.log(categoryDetails);
    res.render("editCategories", { categories: categoryDetails });
  } catch (error) {
    console.log(error);
  }
};


const   updateCategoryData = async (req, res) => {
  try {
    let categoryData = req.body;
    let updateCategory = await Category.updateOne(
      { _id: req.query.id },
      {
        $set: {
          category_name: categoryData.category_name,
          category_description: categoryData.category_description,
        },
      }
    );
    console.log(updateCategory);
    res.redirect("/admin/categories");
  } catch (error) {
    console.log(error);
  }
}; 












const editproductLoad=async(req,res)=>{
  try{
      const id=req.query.id
      const productData=await productModel.findById({_id:id})
      if(productData){
          res.render('editproducts',{product:productData})
      }
      else{
          res.redirect('/admin/products')
      }
     
  } 
  catch(error){
     console.log(error.message)
  }
}
const updateproducts=async(req,res)=>{
  try{
     const productData=await productModel.findByIdAndUpdate({_id:req.body.id},{$set:{name:req.body.name}})
      res.redirect('/admin/products')
  }
  catch(error){
     console.log(error.message)
  }
}




const orderLoad = async (req, res) => {
  try {
    // Fetch all orders with user information
    const orders = await Order.find({})
      .sort({ orderDate: -1 })
      .populate({
        path: 'user',
        model: 'User',
        select: 'username' // Select the fields you want to populate
      });

    // Check if orders data is not null or undefined
    if (orders) {
      res.render('orders', { orders });
    } else {
      console.log('Orders Data is null or undefined');
      res.render('orders', { orders: [] });
    }
  } catch (error) {
    console.log(error);
    res.render('orders', { orders: [], error: 'Error fetching orders data' });
  }
};


const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Fetch order details
    const order = await Order.findById(orderId).populate({
      path: 'cart.products.productId',
      model: 'product',
    });

    // Check if the order exists
    if (!order) {
      return res.status(404).render('error', { message: 'Order not found' });
    }
 

    // Access the order details
    const { cart, deliveryAddress, paymentOption, totalAmount, orderDate} = order;

    // Render order details view with order data
    res.render('orderdetailsadmin', {
      order: { 
        _id: order._id,
        
        cart,
        deliveryAddress,
        paymentOption,
        totalAmount,
        orderDate,
      
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error fetching order details' });
  }
};





const updateOrderStatus = async (req, res) => {
  try {
    const productId = req.params.orderId;
    const newStatus = req.body.status;
   

    // Find the order containing the product
    const order = await Order.findOne({ 'cart.products._id': new mongoose.Types.ObjectId(productId) });

    // Check if the order exists
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Find the product within the order and update its status
    const product = order.cart.products.find(product => product._id.toString() === productId);
    if (product) {
      product.orderStatus = newStatus;

      // Update statusLevel based on newStatus
      switch (newStatus) {
        case 'Shipped':
          product.statusLevel = 2;
          break;
        case 'Out for delivery':
          product.statusLevel = 3;
          break;
        case 'Delivered':
          product.statusLevel = 4;
          break;
        // Add more cases if needed

        default:
          // Handle other status cases
          break;
      }

      await order.save();
    } else {
      return res.status(404).json({
        success: false,
        message: 'Product not found in order',
      });
    }

    // Redirect back to the order details page or orders page
    res.redirect('/admin/orders');
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

// const updateReturnStatus = async (req, res) => {
//   try {
//     const productId = req.params.orderId;
//     const newStatus = req.body.returnstatus;

//     console.log(newStatus)

//     // Find the order containing the product
//     const order = await Order.findOne({ 'cart.products._id': new mongoose.Types.ObjectId(productId) });

//     // Check if the order exists
//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: 'Order not found',
//       });
//     }

//     // Find the product within the order and update its status
//     const product = order.cart.products.find(product => product._id.toString() === productId);
//     if (product) {
//       product.returnOrder.returnStatus = newStatus;

//       // Update statusLevel based on newStatus
//       switch (newStatus) {
//         case 'Out for pickup':
//           product.returnOrder.statusLevel = 2;
//           break;
//         case 'Returned':
//           product.returnOrder.statusLevel = 3;
//           break;
//         case 'Refund':
//           product.returnOrder.statusLevel = 4;
//           break;
//         // Add more cases if needed

//         default:
//           // Handle other status cases
//           break;
//       }

//       await order.save();
//     } else {
//       return res.status(404).json({
//         success: false,
//         message: 'Product not found in order',
//       });
//     }

//     // Redirect back to the order details page or orders page
//     res.redirect('/admin/orders');
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Failed to update return status' });
//   }
// };

const updateReturnStatus = async (req, res) => {
  try {
    
    const productId = req.params.orderId;
    const newStatus = req.body.returnstatus;

    // Find the order containing the product
    const order = await Order.findOne({ 'cart.products._id': new mongoose.Types.ObjectId(productId) });

    // Check if the order exists
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Find the product within the order and update its status
    const product = order.cart.products.find(product => product._id.toString() === productId);
    if (product) {
      product.returnOrder.returnStatus = newStatus;

      // Update statusLevel based on newStatus
      switch (newStatus) {
        case 'Out for pickup':
          product.returnOrder.statusLevel = 2;
          break;
        case 'Returned':
          product.returnOrder.statusLevel = 3;
          break;
        case 'Refund':
          product.returnOrder.statusLevel = 4;

          // Fetch the product by ID to get its price
          const refundedProduct = await Product.findById(product.productId);

          // Increase user's wallet balance
          const user = await userModel.findById(order.user);
          const refundAmount = refundedProduct.product_price;
          user.wallet += refundAmount;
          await user.save();

          // Update wallet history
          user.walletHistory.push({
            date: new Date(),
            amount: refundAmount,
            description: `Refund from order return ${order._id}`,
            transactionType: 'credit',
          });

          await user.save();

          break;
        // Add more cases if needed

        default:
          // Handle other status cases
          break;
      }

      await order.save();
    } else {
      return res.status(404).json({
        success: false,
        message: 'Product not found in order',
      });
    }

    // Redirect back to the order details page or orders page
    res.redirect('/admin/orders');
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update return status' });
  }
};


const couponLoad = async (req, res) => {
  try {
    const couponData = await Coupon.find()
    res.render('coupon', { couponData })
  } catch (error) {
    console.log(error);
  }
};

const couponAdd = async (req, res,next) => {
  try {
    res.render('addcoupon')
  } catch (err) {
  next(err)
  }
}

const couponSet = async (req, res,next) => {
  try {


    const code = req.body.code
    const already = await Coupon.findOne({ code: code })

    if (already) {
      res.render('coupon_admin', { message: 'code already exists' })
    } else {
      const newCoupon = new Coupon({
        code: req.body.code,
        discountPercentage: req.body.discountPercentage,
        startDate: req.body.startDate,
        expireDate: req.body.expiryDate
      })

      await newCoupon.save()
      res.redirect('/admin/coupons')

    }


  } catch (err) {
  next(err)
  }
}

const deleteCoupon = async (req, res,next) => {
  try {
    const id = req.body.id
    await Coupon.findByIdAndDelete({ _id: id })
    console.log('hai');
    res.json({ success: true })
  } catch (err) {
  next(err)
  }
}
const loadCouponEdit=async(req,res,next)=>{
  try {
    const id=req.query.id
    const couponData=await Coupon.findById({_id:id})
  res.render('couponEdit',{data:couponData})
    
  } catch (err) {
    next(err)
  }
}

const editCoupon=async(req,res,next)=>{
  try {
    const id=req.body.id
const    code= req.body.code
const discountPercentage= req.body.discountPercentage
const startDate= req.body.startDate
const  expireDate= req.body.expiryDate
    await Coupon.findByIdAndUpdate({_id:id},{$set:{code:code,discountPercentage:discountPercentage,startDate:startDate,expireDate:expireDate}})
    res.redirect('/admin/coupons')
  } catch (err) {
    next(err)
  }
}

const loaddashboard = async (req, res, next) => {
  try {
    // Fetch the total number of products
    const totalProducts = await Product.countDocuments();

    // Fetch the total number of categories
    const totalCategories = await Category.countDocuments();

    // Fetch the total number of users
    const totalUsers = await userModel.countDocuments();

    // Fetch the total revenue
    const totalRevenue = await Order.aggregate([
      {
        $match: {
          status: { $ne: "pending" },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0;

    const totalOrders = await Order.countDocuments();

    // Fetch data for payment methods
    const paymentMethods = await Order.aggregate([
      {
        $group: {
          _id: "$paymentOption",
          count: { $sum: 1 },
        },
      },
    ]);

    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const dailyOrderCounts = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: "$orderDate" },
            weekOfYear: { $isoWeek: "$orderDate" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Map the daily order counts to a nested array
    const dailyOrderCountsArray = Array(7).fill(0).map(() => Array(52).fill(0));

    dailyOrderCounts.forEach((count) => {
      const dayOfWeek = count._id.dayOfWeek - 1; // Adjust to 0-based index
      const weekOfYear = count._id.weekOfYear - 1; // Adjust to 0-based index
      dailyOrderCountsArray[dayOfWeek][weekOfYear] = count.count;
    });


    const dailyOrderLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    // Fetch the latest orders
    const latestOrders = await Order.find().sort({ orderDate: -1 }).limit(5);

    // Additional data fetching based on your needs...

    // Render the dashboard view with the retrieved data
    res.render('dashboard', {
      totalProducts,
      totalCategories,
      totalUsers,
      revenue,
      latestOrders,
      totalOrders,
      paymentMethods,
      dailyOrderCountsArray,
      dailyOrderLabels
      // Add more data as needed...
    });
  } catch (err) {
    next(err);
  }
};
 
// const loaddashboard=async(req,res)=>{
//   try {
//       res.render('dashboard')
//   } catch (error) {
//       console.log(error.message )
//   }
// }

const offerLoad = async (req, res) => {
  try {
    
    res.render('offer', { })
  } catch (error) {
    console.log(error);
  }
};
const bannerLoad = async (req, res) => {
  try {
    
    res.render('banners', { })
  } catch (error) {
    console.log(error);
  }
};
// const salesreportLoad = async (req, res) => {
//   try {
    
//     res.render('salesreport', { })
//   } catch (error) {
//     console.log(error);
//   }
// };
// const salesreportLoad = async (req, res, next) => {
//   try {
//     const totalAmount = await Order.aggregate([
//       { $unwind: '$cart.products' },
//       { $match: { 'cart.products.orderStatus': 'Delivered' } },
//       { $group: { _id: null, total: { $sum: '$cart.products.price' } } }
//     ]);

//     const totalSold = await Order.aggregate([
//       { $unwind: '$cart.products' },
//       { $match: { 'cart.products.orderStatus': 'Delivered' } },
//       { $group: { _id: null, total: { $sum: '$cart.products.quantity' } } }
//     ]);

//     const products = await Order.find({ 'cart.products.orderStatus': 'Delivered' })
//       .populate('cart.products.productId')
//       .populate('user');

//     console.log(totalAmount, totalSold, products);

//     res.render('salesreport', {
//       totalAmount,
//       totalSold,
//       products,
//     });

//   } catch (err) {
//     console.log(err.message);
//     // Handle error appropriately
//     next(err);
//   }
// };

const salesreportLoad = async (req, res, next) => {
  try {
    const orders = await Order.find({
      $or: [
        { 'paymentOption': 'COD', 'cart.products.orderStatus': 'Delivered', 'status': true },
        { 'paymentOption': { $in: ['Wallet', 'Razorpay'] }, 'status': true },
      ],
    })
      .populate('cart.products.productId')
      .populate('user');

    res.render('salesreport', { 
      orders,
    });

  } catch (err) {
    console.log(err.message);
    // Handle error appropriately
    next(err);
  }
};


const sortSalesReport = async (req, res, next) => {
  try {
    let fromDate = req.body.startDate ? new Date(req.body.startDate) : null;
    fromDate.setHours(0, 0, 0, 0);
    let toDate = req.body.endDate ? new Date(req.body.endDate) : null;
    toDate.setHours(23, 59, 59, 999);

    const currentDate = new Date();

    if (fromDate && toDate) {
      if (toDate < fromDate) {
        const temp = fromDate;
        fromDate = toDate;
        toDate = temp;
      }
    } else if (fromDate) {
      toDate = currentDate;
    } else if (toDate) {
      fromDate = currentDate;
    }

    const orders = await Order.find({
      $or: [
        { 'paymentOption': 'COD', 'cart.products.orderStatus': 'Delivered', 'status': true },
        { 'paymentOption': { $in: ['Wallet', 'Razorpay'] }, 'status': true },
      ],
      orderDate: { $gte: fromDate, $lte: toDate },
    })
    .populate('cart.products.productId')
    .populate('user');

    res.render('salesreport', {
      orders,
    });
  } catch (err) {
    console.log(err.message);
    // Handle error appropriately
    next(err);
  }
};





module.exports={
    loginLoad,
    adminLogout,
    loaddashboard,
    usersLoad,
    categoryLoad,
    addcategoryLoad,
    addCategory,
    editCategoryLoad,
    updateCategoryData,
    unlistCategory,
    blockOrNot,
    editproductLoad,
    updateproducts,
    verifyLogin,
    orderLoad,
    orderDetails,
    updateOrderStatus,
    updateReturnStatus,
    couponLoad,
    couponAdd,
    couponSet,
    deleteCoupon,
    loadCouponEdit,
    editCoupon,
    offerLoad,
    bannerLoad,
    salesreportLoad,
    sortSalesReport

   
   
}