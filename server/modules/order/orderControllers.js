const OrderModel = require("./Order");
const OrderItemModel = require("../orderitem/OrderItem");
const PackageModel = require("../package/Package")
const { Op } = require("sequelize");
const catchAsync = require("../../core/utils/catchAsync");
const { validationResult} = require("express-validator");
const AppError = require("../../core/utils/appError");
const QueryBuilder = require("../../core/utils/QueryBuilder")


exports.getAllOrders = catchAsync(async (req, res, next) => {

  const queryBuilder = new QueryBuilder(req.query)
  queryBuilder.paginate().limitFields()

  let allOrders = await OrderModel.findAndCountAll({...queryBuilder.queryOptions});
  allOrders = queryBuilder.createPagination(allOrders)
  res.json({
    status: "success",
    message: "Barcha buyurtmalar",
    error: null,
    data: {
      allOrders,
    },
  });
});

exports.createOrder = catchAsync(async (req, res, next) => {
  
   const validationError = validationResult(req)
  if(!validationError.isEmpty()){
    let err = new AppError("Validation error", 403)
    err.isOperational = false
    err.errors = validationError.errors
    return next(err)
  }
  let existedPackage = await PackageModel.findOne({where: {storeOwnerId: {[Op.eq]: req.user.id}}})

  if(!existedPackage){
    existedPackage = await PackageModel.create({storeOwnerId: req.user.id})
  }

  const orders = req.body;
  orders?.forEach(async(order)  => {
    const newOrder = await OrderModel.create({
      recipient: order.recipient,
      regionId: order.regionId,
      note: order.note,
      recipientPhoneNumber: order.recipientPhoneNumber,
      districtId: order.districtId,
      packageId: existedPackage.id
    });
    order?.items?.forEach(async (item) => {
      await OrderItemModel.create({
        orderId: newOrder.id,
        orderItemTotalPrice: item.quantity * item.price,
        ...item,
      });
    });
  });

  res.status(201).json({
    status: "success",
    message: 'yangi orderlar qo`shildi',
    errrors: null,
    data: null
  });
  //
});

exports.getOrderById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const queryBuilder = new QueryBuilder(req.query)

  queryBuilder.limitFields()

  const orderById = await OrderModel.findByPk(id, {...queryBuilder.queryOptions,
    include: { model: OrderItemModel, as: "item" },
  });

  if(!orderById){
    return next(new AppError("bunday ID order topilmadi", 404))
  }

  res.status(200).json({
    status: "success",
    message: `${orderById.recipient} mijozning buyurtmasi`,
    error: null,
    data: {orderById}
    });
});