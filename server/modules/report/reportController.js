const excelJS = require("exceljs");
const catchAsync = require("../../core/utils/catchAsync");
const QueryBuilder = require("../../core/utils/QueryBuilder");
const regionsJSON = require("../region/regions.json");
const districtsJSON = require("../district/districts.json");
const User = require("../user/User");
const Order = require("../order/Order");
const userRoles = require("../../core/constants/userRole");
const { Op } = require("sequelize");
const orderStatuses = require("../../core/constants/orderStatus");
const Region = require("../region/Region");
const userStatuses = require("../../core/constants/userStatus");
const dayjs = require("dayjs");
const OrderItem = require("../orderitem/OrderItem");

exports.exportOrders = catchAsync(async (req, res, next) => {
	const { regionId, userRole, id } = req.user;
	const workbook = new excelJS.Workbook();
	const worksheet = workbook.addWorksheet("interEx");
	worksheet.columns = [
		{ header: "No", key: "s_no", width: 5 },
		{ header: "Id", key: "id", width: 10 },
		{ header: "Viloyati", key: "regionId", width: 15 },
		{ header: "Tumani", key: "districtId", width: 15 },
		{ header: "Firma", key: "storeOwnerId", width: 15 },
		{ header: "Mahsulot", key: "orderStatus", width: 20 },
		{
			header: "Telefon raqami",
			key: "recipientPhoneNumber",
			width: 15,
		},
		{ header: "Holati", key: "orderStatusUz", width: 15 },
		{
			header: "Tovar summasi",
			key: "totalPrice",
			width: 10,
		},
		{
			header: "Yetkazish narxi",
			key: "deliveryPrice",
			width: 10,
		},
		{
			header: "Xizmat narxi",
			key: "recipient",
			width: 10,
		},
		{ header: "Firma puli", width: 10 },
		{ header: "Daromad", width: 10 },
		{
			header: "Ortiqcha xarajat",
			key: "expense",
			width: 10,
		},
		{
			header: "Kuryerdan qaytgan pul",
			width: 10,
		},
		{
			header: "Yaratilgan sana",
			key: "createdAt",
			width: 10,
		},
	];
	const queryBuilder = new QueryBuilder(req.query);
	queryBuilder.filter();
	let downloadOrders = await Order.findAndCountAll(queryBuilder.queryOptions);
	let regionName = "Barcha viloyatlar";
	let storeName = "Barcha firmalar";
	let orderDate = "";
	req.query.createdAt
		? (orderDate = new Date(req.query.createdAt["eq"])
				.toLocaleString()
				.split(",")[0])
		: "";
	const region = await Region.findOne({
		attributes: ["id", "name"],
		where: {
			id: {
				[Op.eq]: regionId,
			},
		},
	});
	if (userRole === userRoles.COURIER) {
		if (region?.name === "Samarqand viloyati") {
			queryBuilder.queryOptions.where = {
				regionId: { [Op.eq]: regionId },
				districtId: { [Op.notIn]: [101, 106] },
				...queryBuilder.queryOptions.where,
			};
		} else if (region?.name === "Navoiy viloyati") {
			queryBuilder.queryOptions.where = {
				[Op.or]: {
					regionId: { [Op.eq]: regionId },
					districtId: { [Op.in]: [101, 106] },
				},
				...queryBuilder.queryOptions.where,
			};
		} else if (region?.name === "Xorazm viloyati") {
			queryBuilder.queryOptions.where = {
				regionId: {
					[Op.or]: [1, 13],
				},
				...queryBuilder.queryOptions.where,
			};
		} else {
			queryBuilder.queryOptions.where = {
				regionId: { [Op.eq]: regionId },
				...queryBuilder.queryOptions.where,
			};
		}
		downloadOrders = await Order.findAndCountAll(queryBuilder.queryOptions);
	}
	if (userRole === userRoles.STORE_OWNER) {
		queryBuilder.queryOptions.where = {
			storeOwnerId: { [Op.eq]: id },
			...queryBuilder.queryOptions.where,
		};
		downloadOrders = await Order.findAndCountAll(queryBuilder.queryOptions);
	}
	let downloadCandidate = await User.findAll();
	let downloadOrderItem = await OrderItem.findAll();
	let customUserforDistrict = await User.findOne({
		where: {
			userRole: { [Op.eq]: userRoles.COURIER },
			regionId: { [Op.eq]: 6 },
			status: { [Op.eq]: userStatuses.ACTIVE },
		},
	});
	let customUserforRegion = await User.findOne({
		where: {
			userRole: { [Op.eq]: userRoles.COURIER },
			regionId: { [Op.eq]: 13 },
			status: { [Op.eq]: userStatuses.ACTIVE },
		},
	});

	downloadOrders.rows.forEach((order) => {
		order.recipient = "";
		order.totalPrice = order.totalPrice / 1000;
		order.deliveryPrice = order.deliveryPrice / 1000;
		order.expense = order.expense / 1000;
		downloadCandidate.forEach((candidate) => {
			if (order.storeOwnerId == candidate.id) {
				order.storeOwnerId = candidate.storeName;
			}
			if (req.query.storeOwnerId == candidate.id) {
				storeName = candidate.storeName;
			}
			if (order.regionId == candidate.regionId) {
				order.recipient = +candidate?.tariff / 1000;
			}
			if (order.districtId === 101 || order.districtId === 106) {
				order.recipient = +customUserforDistrict?.tariff / 1000;
			}
			if (order.regionId === 1) {
				if (customUserforRegion) {
					order.recipient = +customUserforRegion.tariff / 1000;
				} else order.recipient = 0;
			}
		});
		downloadOrderItem.forEach((item) => {
			if (order.id == item.orderId) {
				order.orderStatus = item.productName;
			}
		});
		regionsJSON.forEach((region) => {
			if (order.regionId == region.id) {
				order.regionId = region.name.slice(0, region.name.length - 7);
			}
			if (req.query.regionId == region.id) {
				regionName = region.name;
			}
		});
		districtsJSON.forEach((district) => {
			if (order.districtId == district.id) {
				order.districtId = district.name.slice(0, district.name.length - 7);
			}
		});
	});
	const ordersArr = Object.values(downloadOrders.rows.map((e) => e));
	let counter = 1;
	worksheet.addRow();
	ordersArr.forEach((order) => {
		order.s_no = counter;
		worksheet.addRow(order);
		counter++;
	});
	const totalPrice1 = () => {
		const endRow = worksheet.lastRow._number + 1;
		worksheet.getCell(`G${endRow}`).value = "UMUMIY NARX:";
		worksheet.getCell(`H${endRow}`).alignment = {
			horizontal: "center",
		};
		worksheet.getCell(`I${endRow}`).value = {
			formula: `SUM(I3:I${endRow - 1})`,
		};
		worksheet.getCell(`J${endRow}`).value = {
			formula: `SUM(J3:J${endRow - 1})`,
		};
		worksheet.getCell(`K${endRow}`).value = {
			formula: `SUM(K3:K${endRow - 1})`,
		};
		worksheet.mergeCells(`G${endRow}:H${endRow}`);
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`L${i}`).value =
				worksheet.getCell(`I${i}`).value -
				worksheet.getCell(`J${i}`).value -
				worksheet.getCell(`N${i}`).value;
		}
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`M${i}`).value =
				worksheet.getCell(`J${i}`).value - worksheet.getCell(`K${i}`).value;
		}
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`O${i}`).value =
				worksheet.getCell(`I${i}`).value - worksheet.getCell(`K${i}`).value - worksheet.getCell(`N${i}`).value;
		}
		worksheet.getCell(`L${endRow}`).value = {
			formula: `SUM(L3:L${endRow - 1})`,
		};
		worksheet.getCell(`M${endRow}`).value = {
			formula: `SUM(M3:M${endRow - 1})`,
		};
		worksheet.getCell(`N${endRow}`).value = {
			formula: `SUM(N3:N${endRow - 1})`,
		};
		worksheet.getCell(`O${endRow}`).value = {
			formula: `SUM(O3:O${endRow - 1})`,
		};
	};
	const totalPrice2 = () => {
		const endRow = worksheet.lastRow._number + 1;
		worksheet.getCell(`F${endRow}`).value = "UMUMIY NARX:";
		worksheet.getCell(`G${endRow}`).alignment = {
			horizontal: "center",
		};
		worksheet.getCell(`H${endRow}`).value = {
			formula: `SUM(H3:H${endRow - 1})`,
		};
		worksheet.getCell(`I${endRow}`).value = {
			formula: `SUM(I3:I${endRow - 1})`,
		};
		worksheet.getCell(`J${endRow}`).value = {
			formula: `SUM(J3:J${endRow - 1})`,
		};
		worksheet.mergeCells(`F${endRow}:G${endRow}`);
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`K${i}`).value =
				worksheet.getCell(`H${i}`).value -
				worksheet.getCell(`I${i}`).value -
				worksheet.getCell(`M${i}`).value;
		}
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`L${i}`).value =
				worksheet.getCell(`I${i}`).value - worksheet.getCell(`J${i}`).value;
		}
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`N${i}`).value =
				worksheet.getCell(`H${i}`).value - worksheet.getCell(`J${i}`).value - worksheet.getCell(`M${i}`).value;
		}
		worksheet.getCell(`K${endRow}`).value = {
			formula: `SUM(K3:K${endRow - 1})`,
		};
		worksheet.getCell(`L${endRow}`).value = {
			formula: `SUM(L3:L${endRow - 1})`,
		};
		worksheet.getCell(`M${endRow}`).value = {
			formula: `SUM(M3:M${endRow - 1})`,
		};
		worksheet.getCell(`N${endRow}`).value = {
			formula: `SUM(N3:N${endRow - 1})`,
		};
	};
	const totalPrice3 = () => {
		const endRow = worksheet.lastRow._number + 1;
		worksheet.getCell(`E${endRow}`).value = "UMUMIY NARX:";
		worksheet.getCell(`F${endRow}`).alignment = {
			horizontal: "center",
		};
		worksheet.getCell(`G${endRow}`).value = {
			formula: `SUM(G3:G${endRow - 1})`,
		};
		worksheet.getCell(`H${endRow}`).value = {
			formula: `SUM(H3:H${endRow - 1})`,
		};
		worksheet.getCell(`I${endRow}`).value = {
			formula: `SUM(I3:I${endRow - 1})`,
		};
		worksheet.mergeCells(`E${endRow}:F${endRow}`);
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`J${i}`).value =
				worksheet.getCell(`G${i}`).value -
				worksheet.getCell(`H${i}`).value -
				worksheet.getCell(`L${i}`).value;
		}
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`K${i}`).value =
				worksheet.getCell(`H${i}`).value - worksheet.getCell(`I${i}`).value;
		}
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`M${i}`).value =
				worksheet.getCell(`G${i}`).value - worksheet.getCell(`I${i}`).value - worksheet.getCell(`L${i}`).value;
		}
		worksheet.getCell(`J${endRow}`).value = {
			formula: `SUM(J3:J${endRow - 1})`,
		};
		worksheet.getCell(`K${endRow}`).value = {
			formula: `SUM(K3:K${endRow - 1})`,
		};
		worksheet.getCell(`L${endRow}`).value = {
			formula: `SUM(L3:L${endRow - 1})`,
		};
		worksheet.getCell(`M${endRow}`).value = {
			formula: `SUM(M3:M${endRow - 1})`,
		};
	};
	const totalPrice4 = () => {
		const endRow = worksheet.lastRow._number + 1;
		worksheet.getCell(`F${endRow}`).value = "UMUMIY NARX:";
		worksheet.getCell(`G${endRow}`).alignment = {
			horizontal: "center",
		};
		worksheet.getCell(`H${endRow}`).value = {
			formula: `SUM(H3:H${endRow - 1})`,
		};
		worksheet.getCell(`I${endRow}`).value = {
			formula: `SUM(I3:I${endRow - 1})`,
		};
		worksheet.mergeCells(`F${endRow}:G${endRow}`);
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`J${i}`).value =
				worksheet.getCell(`H${i}`).value -
				worksheet.getCell(`I${i}`).value -
				worksheet.getCell(`K${i}`).value;
		}
		worksheet.getCell(`J${endRow}`).value = {
			formula: `SUM(J3:J${endRow - 1})`,
		};
		worksheet.getCell(`K${endRow}`).value = {
			formula: `SUM(K3:K${endRow - 1})`,
		};
	};
	const totalPrice5 = () => {
		const endRow = worksheet.lastRow._number + 1;
		worksheet.getCell(`E${endRow}`).value = "UMUMIY NARX:";
		worksheet.getCell(`F${endRow}`).alignment = {
			horizontal: "center",
		};
		worksheet.getCell(`G${endRow}`).value = {
			formula: `SUM(G3:G${endRow - 1})`,
		};
		worksheet.getCell(`H${endRow}`).value = {
			formula: `SUM(H3:H${endRow - 1})`,
		};
		worksheet.mergeCells(`E${endRow}:F${endRow}`);
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`I${i}`).value =
				worksheet.getCell(`G${i}`).value -
				worksheet.getCell(`H${i}`).value -
				worksheet.getCell(`J${i}`).value;
		}
		worksheet.getCell(`I${endRow}`).value = {
			formula: `SUM(I3:I${endRow - 1})`,
		};
		worksheet.getCell(`J${endRow}`).value = {
			formula: `SUM(J3:J${endRow - 1})`,
		};
	};
	const totalPrice6 = () => {
		const endRow = worksheet.lastRow._number + 1;
		worksheet.getCell(`G${endRow}`).value = "UMUMIY NARX:";
		worksheet.getCell(`H${endRow}`).alignment = {
			horizontal: "center",
		};
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`L${i}`).value =
				worksheet.getCell(`I${i}`).value - worksheet.getCell(`J${i}`).value - worksheet.getCell(`K${i}`).value;
		}
		worksheet.getCell(`I${endRow}`).value = {
			formula: `SUM(I3:I${endRow - 1})`,
		};
		worksheet.getCell(`J${endRow}`).value = {
			formula: `SUM(J3:J${endRow - 1})`,
		};
		worksheet.getCell(`K${endRow}`).value = {
			formula: `SUM(K3:K${endRow - 1})`,
		};
		worksheet.getCell(`L${endRow}`).value = {
			formula: `SUM(L3:L${endRow - 1})`,
		};
		worksheet.mergeCells(`G${endRow}:H${endRow}`);
	};
	const totalPrice7 = () => {
		const endRow = worksheet.lastRow._number + 1;
		worksheet.getCell(`F${endRow}`).value = "UMUMIY NARX:";
		worksheet.getCell(`G${endRow}`).alignment = {
			horizontal: "center",
		};
		for (i = 3; i < endRow; i++) {
			worksheet.getCell(`K${i}`).value =
				worksheet.getCell(`H${i}`).value - worksheet.getCell(`I${i}`).value - worksheet.getCell(`J${i}`).value;
		}
		worksheet.getCell(`H${endRow}`).value = {
			formula: `SUM(H3:H${endRow - 1})`,
		};
		worksheet.getCell(`I${endRow}`).value = {
			formula: `SUM(I3:I${endRow - 1})`,
		};
		worksheet.getCell(`J${endRow}`).value = {
			formula: `SUM(J3:J${endRow - 1})`,
		};
		worksheet.getCell(`K${endRow}`).value = {
			formula: `SUM(K3:K${endRow - 1})`,
		};
		worksheet.mergeCells(`F${endRow}:G${endRow}`);
	};
	if (
		req.query.regionId &&
		!req.query.storeOwnerId &&
		!req.query.createdAt &&
		(userRole === userRoles.ADMIN || userRole === userRoles.SUPER_ADMIN)
	) {
		worksheet.spliceColumns(3, 1);
		totalPrice2();
	}
	if (
		req.query.storeOwnerId &&
		!req.query.regionId &&
		!req.query.createdAt &&
		(userRole === userRoles.ADMIN || userRole === userRoles.SUPER_ADMIN)
	) {
		worksheet.spliceColumns(5, 1);
		totalPrice2();
	}
	if (
		req.query.createdAt &&
		!req.query.regionId &&
		!req.query.storeOwnerId &&
		(userRole === userRoles.ADMIN || userRole === userRoles.SUPER_ADMIN)
	) {
		worksheet.spliceColumns(16, 1);
		totalPrice1();
	}
	if (
		req.query.regionId &&
		req.query.storeOwnerId &&
		!req.query.createdAt &&
		(userRole === userRoles.ADMIN || userRole === userRoles.SUPER_ADMIN)
	) {
		worksheet.spliceColumns(3, 1);
		worksheet.spliceColumns(4, 1);
		totalPrice3();
	}
	if (
		req.query.regionId &&
		!req.query.storeOwnerId &&
		req.query.createdAt &&
		(userRole === userRoles.ADMIN || userRole === userRoles.SUPER_ADMIN)
	) {
		worksheet.spliceColumns(3, 1);
		worksheet.spliceColumns(15, 1);
		totalPrice2();
	}
	if (
		!req.query.regionId &&
		req.query.storeOwnerId &&
		req.query.createdAt &&
		(userRole === userRoles.ADMIN || userRole === userRoles.SUPER_ADMIN)
	) {
		worksheet.spliceColumns(5, 1);
		worksheet.spliceColumns(15, 1);
		totalPrice2();
	}
	if (
		req.query.regionId &&
		req.query.storeOwnerId &&
		req.query.createdAt &&
		(userRole === userRoles.ADMIN || userRole === userRoles.SUPER_ADMIN)
	) {
		worksheet.spliceColumns(3, 1);
		worksheet.spliceColumns(4, 1);
		worksheet.spliceColumns(14, 1);
		totalPrice3();
	}
	if (
		!req.query.regionId &&
		!req.query.storeOwnerId &&
		!req.query.createdAt &&
		(userRole === userRoles.ADMIN || userRole === userRoles.SUPER_ADMIN)
	) {
		totalPrice1();
	}
	if (
		!req.query.regionId &&
		!req.query.createdAt &&
		userRole === userRoles.STORE_OWNER
	) {
		storeName = req.user.storeName;
		worksheet.spliceColumns(5, 1);
		worksheet.spliceColumns(10, 1);
		worksheet.spliceColumns(11, 1);
		worksheet.spliceColumns(12, 1);
		totalPrice4();
	}
	if (
		req.query.createdAt &&
		!req.query.regionId &&
		userRole === userRoles.STORE_OWNER
	) {
		storeName = req.user.storeName;
		worksheet.spliceColumns(5, 1);
		worksheet.spliceColumns(10, 1);
		worksheet.spliceColumns(11, 1);
		worksheet.spliceColumns(12, 1);
		worksheet.spliceColumns(12, 1);
		totalPrice4();
	}
	if (
		!req.query.createdAt &&
		req.query.regionId &&
		userRole === userRoles.STORE_OWNER
	) {
		storeName = req.user.storeName;
		worksheet.spliceColumns(3, 1);
		worksheet.spliceColumns(4, 1);
		worksheet.spliceColumns(9, 1);
		worksheet.spliceColumns(10, 1);
		worksheet.spliceColumns(11, 1);
		totalPrice5();
	}
	if (
		req.query.createdAt &&
		req.query.regionId &&
		userRole === userRoles.STORE_OWNER
	) {
		storeName = req.user.storeName;
		worksheet.spliceColumns(3, 1);
		worksheet.spliceColumns(4, 1);
		worksheet.spliceColumns(9, 1);
		worksheet.spliceColumns(10, 1);
		worksheet.spliceColumns(11, 1);
		worksheet.spliceColumns(11, 1);
		totalPrice5();
	}
	if (
		!req.query.regionId &&
		!req.query.createdAt &&
		userRole === userRoles.COURIER
	) {
		worksheet.spliceColumns(10, 1);
		worksheet.spliceColumns(11, 1);
		worksheet.spliceColumns(11, 1);
		totalPrice6();
	}
	if (
		req.query.createdAt &&
		!req.query.regionId &&
		userRole === userRoles.COURIER
	) {
		worksheet.spliceColumns(10, 1);
		worksheet.spliceColumns(11, 1);
		worksheet.spliceColumns(11, 1);
		worksheet.spliceColumns(13, 1);
		totalPrice6();
	}
	if (
		!req.query.createdAt &&
		req.query.regionId &&
		userRole === userRoles.COURIER
	) {
		worksheet.spliceColumns(3, 1);
		worksheet.spliceColumns(9, 1);
		worksheet.spliceColumns(10, 1);
		worksheet.spliceColumns(10, 1);
		totalPrice7();
	}
	if (
		req.query.createdAt &&
		req.query.regionId &&
		userRole === userRoles.COURIER
	) {
		worksheet.spliceColumns(3, 1);
		worksheet.spliceColumns(9, 1);
		worksheet.spliceColumns(10, 1);
		worksheet.spliceColumns(10, 1);
		worksheet.spliceColumns(12, 1);
		totalPrice7();
	}
	worksheet.getCell(`B2`).value = `${orderDate}`;
	worksheet.getCell(`D2`).value = `${regionName}`;
	worksheet.getCell(`F2`).value = `${storeName}`;
	worksheet.mergeCells("B2:C2");
	worksheet.mergeCells("D2:E2");
	worksheet.mergeCells("F2:H2");
	worksheet.eachRow((row) => {
		row.eachCell((cell) => {
			cell.border = {
				top: { style: "thin" },
				left: { style: "thin" },
				bottom: { style: "thin" },
				right: { style: "thin" },
			};
		});
	});
	worksheet.eachRow((row) => {
		row.eachCell((cell) => {
			cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true
      }
			if (cell.model.value === "KUTILMOQDA") {
				row.font = {
					color: { argb: "dd2727" },
				};
			}
			if (
				cell.model.value === "FIRMA OLDI" ||
				cell.model.value === "FIRMA OLMADI" ||
				cell.model.value === "OTKAZ BORDI"
			) {
				row.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "f4f183" },
				};
			}
		});
	});
	worksheet.getRow(1).height = 30;
	worksheet.getRow(1).eachCell((cell) => {
		(cell.font = { bold: true }),
			(cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "ffd385" },
			})
	});
	worksheet.getRow(2).eachCell((cell) => {
		(cell.font = { bold: true }),
			(cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "b9b8b7" },
			});
	});
	res.setHeader(
		"Content-Type",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	);
	res.setHeader("Content-Disposition", "attachment; filename=interEx.xlsx");
	return workbook.xlsx.write(res).then(() => {
		res.status(200).end();
	});
});
exports.getStatistics = catchAsync(async (req, res, next) => {
	const { userRole, id, regionId } = req.user;
	let allOrders = 0;
	let soldOrders = 0;
	let rejectedOrders = 0;
	let allStores = 0;
	let allUsers = 0;
	let dayData = [];
	let monthData = [];
	let yearData = [];
  	let today = new Date()
	const rejectedOrderStatuses = Object.values(orderStatuses).slice(8);

	//................Statistics for ADMIN and SUPER_ADMIN starts here ....................
	if (userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "COURIER") {
		allStores = await User.count({
			where: {
				userRole: {[Op.eq]: userRoles.STORE_OWNER},
				status: {[Op.eq]: userStatuses.ACTIVE}
			}
		})
	}	

	if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
		allOrders = await Order.count();

		soldOrders = await Order.count({
			where: {
				orderStatus: {
					[Op.eq]: orderStatuses.STATUS_SOLD,
				},
			},
		});

		rejectedOrders = await Order.count({
			where: {
				orderStatus: { [Op.in]: rejectedOrderStatuses },
			},
		});

		ordersSold = await Order.findAll({
			where: {
				orderStatus: {
					[Op.eq]: orderStatuses.STATUS_SOLD,
				},
			},
		});

		allUsers = await User.count({
			where: {
				status: { [Op.eq]: "ACTIVE" },
			},
		});

		const soldOrdersperDay = await Order.count({
			where: {
				orderStatus: {
					[Op.eq]: orderStatuses.STATUS_SOLD,
				},
				updatedAt: {
					[Op.or]: {
						[Op.gte]: dayjs(`${today}`)
							.startOf("day")
							.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
						[Op.lte]: dayjs(`${today}`)
							.endOf("day")
							.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
					},
				},
			},
		});
		dayData.push(soldOrdersperDay);

		const soldOrdersperMonth = await Order.count({
			where: {
				orderStatus: {
					[Op.eq]: orderStatuses.STATUS_SOLD,
				},
				updatedAt: {
					[Op.or]: {
						[Op.gte]: dayjs(`${today}`)
							.startOf("month")
							.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
						[Op.lte]: dayjs(`${today}`)
							.endOf("month")
							.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
					},
				},
			},
		});
		monthData.push(soldOrdersperMonth);

		const soldOrdersperYear = await Order.count({
			where: {
				orderStatus: {
					[Op.eq]: orderStatuses.STATUS_SOLD,
				},
				updatedAt: {
					[Op.or]: {
						[Op.gte]: dayjs(`${today}`)
							.startOf("year")
							.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
						[Op.lte]: dayjs(`${today}`)
							.endOf("year")
							.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
					},
				},
			},
		});
		yearData.push(soldOrdersperYear);
	}
	//................Statistics for STORE starts here ....................

	if (userRole === "STORE_OWNER") {
		allStores = 1
		allOrders = await Order.count({
			where: {
				storeOwnerId: {
					[Op.eq]: id,
				},
			},
		});

		soldOrders = await Order.count({
			where: {
				orderStatus: {
					[Op.eq]: orderStatuses.STATUS_SOLD,
				},
				storeOwnerId: {
					[Op.eq]: id,
				},
			},
		});

		rejectedOrders = await Order.count({
			where: {
				orderStatus: {
					[Op.in]: rejectedOrderStatuses,
				},
				storeOwnerId: {
					[Op.eq]: id,
				},
			},
		});
	}

	//............................ statistics for COURIER satrts here ..........................
	if (userRole === "COURIER") {
		const region = await Region.findOne({
			attributes: ["id", "name"],
			where: {
				id: {
					[Op.eq]: regionId,
				},
			},
		});

		if (region.name === "Samarqand viloyati") {
			allOrders = await Order.count({
				where: {
					regionId: {
						[Op.eq]: regionId,
					},
					districtId: {
						[Op.notIn]: [101, 106],
					},
				},
			});

			soldOrders = await Order.count({
				where: {
					orderStatus: {
						[Op.eq]: orderStatuses.STATUS_SOLD,
					},
					regionId: {
						[Op.eq]: regionId,
					},
					districtId: {
						[Op.notIn]: [101, 106],
					},
				},
			});

			rejectedOrders = await Order.count({
				where: {
					orderStatus: {
						[Op.in]: rejectedOrderStatuses,
					},
					regionId: {
						[Op.eq]: regionId,
					},
					districtId: {
						[Op.notIn]: [101, 106],
					},
				},
			});
		} else if (region.name === "Navoiy viloyati") {
			allOrders = await Order.count({
				where: {
					[Op.or]: {
						regionId: {
							[Op.eq]: regionId,
						},
						districtId: {
							[Op.in]: [101, 106],
						},
					},
				},
			});

			soldOrders = await Order.count({
				where: {
					[Op.and]: [
						{
							orderStatus: {
								[Op.eq]: orderStatuses.STATUS_SOLD,
							},
						},
						{
							[Op.or]: {
								regionId: {
									[Op.eq]: regionId,
								},
								districtId: {
									[Op.in]: [101, 106],
								},
							},
						},
					],
				},
			});

			rejectedOrders = await Order.count({
				where: {
					[Op.and]: [
						{
							orderStatus: {
								[Op.in]: rejectedOrderStatuses,
							},
						},
						{
							[Op.or]: {
								regionId: {
									[Op.eq]: regionId,
								},
								districtId: {
									[Op.in]: [101, 106],
								},
							},
						},
					],
				},
			});
		} else if (region.name === "Xorazm viloyati") {
			allOrders = await Order.count({
				where: {
					regionId: {
						[Op.in]: [1, regionId],
					},
				},
			});

			soldOrders = await Order.count({
				where: {
					orderStatus: {
						[Op.eq]: orderStatuses.STATUS_SOLD,
					},
					regionId: {
						[Op.in]: [1, regionId],
					},
				},
			});

			rejectedOrders = await Order.count({
				where: {
					orderStatus: {
						[Op.in]: rejectedOrderStatuses,
					},
					regionId: {
						[Op.in]: [1, regionId],
					},
				},
			});
		} else {
			allOrders = await Order.count({
				where: {
					regionId: {
						[Op.eq]: regionId,
					},
				},
			});

			soldOrders = await Order.count({
				where: {
					orderStatus: {
						[Op.eq]: orderStatuses.STATUS_SOLD,
					},
					regionId: {
						[Op.eq]: regionId,
					},
				},
			});

			rejectedOrders = await Order.count({
				where: {
					orderStatus: {
						[Op.in]: rejectedOrderStatuses,
					},
					regionId: {
						[Op.eq]: regionId,
					},
				},
			});
		}
	}

	res.json({
		status: "success",
		message: "Statistika uchun ma'lumotlar",
		error: null,
		data: {
			allOrders,
			allStores,
			soldOrders,
			rejectedOrders,
			dayData,
			monthData,
			yearData,
		},
	});
});

exports.countsInRegionsAndMonths = catchAsync(async (req, res, next) => {
	const { id, userRole } = req.user;
	let queryBuilder;
	const getRegions = await Region.findAll();
	let countOrderinRegions = [];
	let countOrderinMonths = [];
	let regions = {
		labels: [],
		datasets: [],
	};
	let months = {
		labels: [],
		datasets: [],
	};
	getRegions?.map(async (region) => {
		if (userRole === "STORE_OWNER") {
			queryBuilder = {
				where: {
					regionId: { [Op.eq]: region.id },
					storeOwnerId: { [Op.eq]: id },
				},
			};
		} else {
			queryBuilder = {
				where: {
					regionId: { [Op.eq]: region.id },
				},
			};
		}
		const count = await Order.count(queryBuilder);
		countOrderinRegions.push(count);
		regions.labels.push(region.name);
	});

	const monthsIndexArr = [
		{ name: "Yanvar", month: 1, end: 31 },
		{
			name: "Fevral",
			month: 2,
			end: new Date().getFullYear() % 4 === 0 ? 29 : 28,
		},
		{ name: "Mart", month: 3, end: 31 },
		{ name: "Aprel", month: 4, end: 30 },
		{ name: "May", month: 5, end: 31 },
		{ name: "Iyun", month: 6, end: 30 },
		{ name: "Iyul", month: 7, end: 31 },
		{ name: "Avgust", month: 8, end: 31 },
		{ name: "Sentyabr", month: 9, end: 30 },
		{ name: "Oktyabr", month: 10, end: 31 },
		{ name: "Noyabr", month: 11, end: 30 },
		{ name: "Dekabr", month: 12, end: 31 },
	];

	monthsIndexArr.forEach(async (month) => {
		const start = new Date(
			`${new Date().getFullYear()}-${month.month}-01 00:00:00.000+00`
		);
		const end = new Date(
			`${new Date().getFullYear()}-${month.month}-${month.end} 23:59:59.000+00`
		);
		let queryWhere;
		if (userRole === "STORE_OWNER") {
			queryWhere = {
				where: {
					storeOwnerId: { [Op.eq]: id },
					createdAt: {
						[Op.gt]: start,
						[Op.lte]: end,
					},
				},
			};
		} else {
			queryWhere = {
				where: {
					createdAt: {
						[Op.gt]: start,
						[Op.lte]: end,
					},
				},
			};
		}
		const countInMonth = await Order.count(queryWhere);
		months.labels.push(month.name);
		countOrderinMonths.push(countInMonth);
	});

	regions.datasets.push({
		data: countOrderinRegions,
	});

	months.datasets.push({
		data: countOrderinMonths,
	});
	setTimeout(() => {
		res.send({ regions, months });
	}, 1000);
});