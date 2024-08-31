const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const fs = require('fs');
const path = require('path');

// Function to load the Add Product page
const loadAddProduct = async (req, res) => {
    try {
        const categoryData = await Category.find({ isListed: false });
        res.render('add-product', { categoryData });
    } catch (error) {
        console.log("Error loading add product page:", error);
        res.status(500).send('Server Error');
    }
};

// Function to add a new product
const addProduct = async (req, res) => {
    try {
        const { productName, description, category, price, quantity, status } = req.body;

        if (!req.files.productImage1 || !req.files.productImage2 || !req.files.productImage3) {
            return res.status(400).send('All three images are required');
        }

        const product = new Product({
            productName,
            description,
            category,
            price,
            quantity,
            productImage: [
                "/productImages/" + req.files.productImage1[0].filename,
                "/productImages/" + req.files.productImage2[0].filename,
                "/productImages/" + req.files.productImage3[0].filename
            ],
            status
        });

        await product.save();
        res.redirect('/admin/products');
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Function to load products for display
const getProducts = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;

        const products = await Product.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('category', 'name isListed'); // Populate category data

        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('products', {
            products: products,
            currentPage: page,
            totalPages: totalPages,
            totalProducts: totalProducts
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Function to load the Edit Product page
const getEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const categoryData = await Category.find({ isListed: false });
        const editProductData = await Product.findById(productId);

        res.render('edit-product', {
            product: editProductData,
            categories: categoryData
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
};

// Function to handle editing a product
const updateProduct = async (req, res) => {
    // console.log(req.body);
    
    try {
        const productId = req.params.id;
        const updateProductData = {
            productName: req.body.productName,
            description: req.body.description,
            price: req.body.price,
            quantity: req.body.quantity,
            category: req.body.category,
            status: req.body.status
        };

        // Handle new images upload
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => {
                return "/productImages/" + file.filename;
            });

            const existingImages = Array.isArray(req.body.existingImages) ? req.body.existingImages : [];

            updateProductData.productImage = [...existingImages, ...newImages];
        } else {
            updateProductData.productImage = req.body.existingImages;
        }

        await Product.findByIdAndUpdate(productId, updateProductData, { new: true });
        res.redirect('/admin/products');
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
};

// Function to list a product
const listProduct = async (req, res) => {
    try {
        let productId = req.query.id;
        await Product.updateOne({ _id: productId }, { $set: { isBlocked: false } });
        res.redirect('/admin/products');
    } catch (error) {
        console.log("Error listing product:", error);
        res.redirect('/pageError');
    }
};

// Function to unlist a product
const unlistProduct = async (req, res) => {
    try {
        let productId = req.query.id;
        await Product.updateOne({ _id: productId }, { $set: { isBlocked: true } });
        res.redirect('/admin/products');
    } catch (error) {
        console.log("Error unlisting product:", error);
        res.redirect('/pageError');
    }
};

// Function to delete a product image
const deleteImage = async (req, res) => {
    try {
        const { productId, image } = req.body;

        // Remove the image from the filesystem
        const imagePath = path.join(__dirname, '../../public', image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        // Remove the image from the product document
        await Product.findByIdAndUpdate(productId, { $pull: { productImage: image } });

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting image:', err);
        res.status(500).json({ success: false });
    }
};

module.exports = {
    loadAddProduct,
    addProduct,
    getProducts,
    getEditProduct,
    updateProduct,
    listProduct,
    unlistProduct,
    deleteImage
};
