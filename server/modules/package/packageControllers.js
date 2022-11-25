const catchAsync = require("../../core/utils/catchAsync");
const { Op, where } = require("sequelize");
const QueryBuilder = require("../../core/utils/QueryBuilder");
const PackageModel = require("./Package");
const OrderModel = require("../order/Order");
const UserModel = require("../user/User");
const DistrictModel = require("../district/District")
const RegionModel = require("../region/Region")
const statusPackages = require("../../core/constants/packageStatus")
const statusOrder = require("../../core/constants/orderStatus")
const {Table, TableRow, TableCell, WidthType, Paragraph, TextRun, Document, Packer, SectionType} = require("docx")


exports.getAllPackages = catchAsync(async (req, res, next) => {
	console.log(13 ,"qator");
	const userId = req.user.id 
	const queryBuilder = new QueryBuilder(req.query);
	queryBuilder.filter().paginate().limitFields().sort();
	
	if(req.user.userRole === "STORE_OWNER"){
		if(req.query.new === "new"){
			queryBuilder.queryOptions.where = {
				packageStatus: {[Op.eq]: statusPackages.STATUS_NEW},
				storeOwnerId: {[Op.eq]: userId},
				// ...queryBuilder.queryOptions.where
				}
		}else{
			queryBuilder.queryOptions.where = {
				storeOwnerId: {[Op.eq]: userId},
				// ...queryBuilder.queryOptions.where
				}
	}
	}else{
		if(req.query.new === "new"){
		queryBuilder.queryOptions.where = {
			packageStatus: {[Op.eq]: statusPackages.STATUS_NEW},
			}
	}}
	queryBuilder.queryOptions.include = {
		model: UserModel,
		as: "storeOwner",
		attributes: ["firstName", "lastName", "storeName"],
	}
	let allPackages = await PackageModel.findAndCountAll(queryBuilder.queryOptions);

	allPackages = queryBuilder.createPagination(allPackages);

	res.status(200).json({
		status: "success",
		message: "Barcha paketlar ro`yhati",
		errors: null,
		data: {
			...allPackages,
		},
	});
});

exports.getOrdersByPackage = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	req.query.packageId = id
	const queryBuilder = new QueryBuilder(req.query);
	queryBuilder.paginate().limitFields().sort().filter().search(["recipient", "recipientPhoneNumber"]);

	queryBuilder.queryOptions.include = [
		{model: UserModel, as: "storeOwner", attributes: ["storeName"]},
		{model: DistrictModel, as: "district", attributes: ["name"]},
		{model: RegionModel, as: "region", attributes: ["name"]}
	] 

	let ordersbyPackage = await OrderModel.findAndCountAll(
		queryBuilder.queryOptions
		);
	ordersbyPackage = queryBuilder.createPagination(ordersbyPackage)
	res.status(200).json({
		status: "success",
		message: "id bo`yicha package ma`lumotlari",
		errors: null,
		data: {
			...ordersbyPackage,
		},
	});
});

exports.downloadWord = catchAsync(async(req,res,next)=>{
	const {id} = req.params;

	let allNewOrdersbyPackage = await OrderModel.findAll(
		{include: [
			{model: UserModel, as: "storeOwner"},
			{model: RegionModel, as: "region"},
			{model: DistrictModel, as: "district"},
			{model: DistrictModel, as: "district"},
		],
			where: {[Op.and]: [
		{packageId: {[Op.eq]: id}},
		{orderStatus: {[Op.eq]: statusOrder.STATUS_ACCEPTED }}
	]}}
	)

	let ordersArr = []
	for(let i = 0; i <allNewOrdersbyPackage.length; i+3){
		let thereArr = allNewOrdersbyPackage.splice(i,3)
		if(thereArr.length%3 ===1){
			thereArr.push({}, {})
		}else if(thereArr.length%3 === 2){
			thereArr.push({})
		}
		ordersArr.push(thereArr)
	}
	
	let children = []
	ordersArr?.forEach((orderArr)=>{
		const table = new Table({margins: {right: 1000},
			columnWidths: [3500, 3500, 3500],
			rows: [
				new TableRow({ cantSplit: true,
					children: [
						new TableCell({
							width: {
								size: 3500,
								type: WidthType.DXA,
							},
							children: [
								new Paragraph({children: []}),
								new Paragraph({ 
								children: [
									new TextRun("Xaridor"),
									new TextRun("   "),
									new TextRun(`${orderArr[0].recipient || null}`)
								],
								
							}),
								new Paragraph({children: [
								new TextRun("Viloyati"),
								new TextRun("   "),
								new TextRun(`${orderArr[0].region?.name || null}`)
								
							]
						}), 
								new Paragraph({children: [
							new TextRun("summasi"),
							new TextRun("   "),
							new TextRun(`${orderArr[0].totalPrice || null}`)
							
						]
					}), 
								new Paragraph({children: [
						new TextRun("Firma"),
						new TextRun("   "),
						new TextRun(`${orderArr[0].storeOwner.storeName || null}`)
						
					]
				}), 
								new Paragraph({children: [
					new TextRun("tel Nomeri"),
					new TextRun("   "),
					new TextRun(`${orderArr[0].recipientPhoneNumber || null}`)
					
				]
			}),
							],
						}),
						new TableCell({
							width: {
								size: 3500,
								type: WidthType.DXA,
							},
							children: [
								new Paragraph({children: []}),
								new Paragraph({ 
								children: [
									new TextRun("Xaridor"),
									new TextRun("   "),
									new TextRun(`${orderArr[1].recipient || null}`)
								],
								
							}),
							new Paragraph({children: [
								new TextRun("Viloyati"),
								new TextRun("   "),
								new TextRun(`${orderArr[1].region?.name || null}`)
								
							]
						}), new Paragraph({children: [
							new TextRun("summasi"),
							new TextRun("   "),
							new TextRun(`${orderArr[1].totalPrice || null}`)
							
						]
					}), 
					new Paragraph({children: [
						new TextRun("Firma"),
						new TextRun("   "),
						new TextRun(`${orderArr[1].storeOwner?.storeName || null}`)
						
					]
				}), new Paragraph({children: [
					new TextRun("tel Nomeri"),
					new TextRun("   "),
					new TextRun(`${orderArr[1].recipientPhoneNumber || null}`)
					
				]
			})
							],
						}),
						new TableCell({
							width: {
								size: 3500,
								type: WidthType.DXA,
							},
							children: [
								new Paragraph({children: []}),
								new Paragraph({ 
								children: [
									new TextRun("Xaridor"),
									new TextRun("   "),
									new TextRun(`${orderArr[2].recipient || null}`)
								],
								
							}),
							new Paragraph({children: [
								new TextRun("Viloyati"),
								new TextRun("   "),
								new TextRun(`${orderArr[2].region?.name || null}`)
								
							]
						}), new Paragraph({children: [
							new TextRun("summasi"),
							new TextRun("   "),
							new TextRun(`${orderArr[2].totalPrice || null}`)
							
						]
					}), 
					new Paragraph({children: [
						new TextRun({
							text: "Firma",
							bold: true
						}),
						new TextRun("   "),
						new TextRun(`${orderArr[2].storeOwner?.storeName || null}`)
						
					]
				}), new Paragraph({children: [
					new TextRun("tel Nomeri"),
					new TextRun("   "),
					new TextRun(`${orderArr[2].recipientPhoneNumber || null}`)
					
				]
			})
							],
						})
					],
				}),
			],
		})
		const parag = new Paragraph("")
		children.push(table)
		})

		const doc = new Document({
			sections: [
				{
					properties: {
						column: 3,
						grid: 50,
						type: SectionType.NEXT_COLUMN
					},
					children
				},
			],
		});
		res.setHeader('Content-Disposition', 'attachment; filename=My Document.docx');
		return Packer.toBuffer(doc).then((buffer)=>{
			res.status(200).end(buffer);
		});
})