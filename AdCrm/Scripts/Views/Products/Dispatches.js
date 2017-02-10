var koModel = {
    filter: {
        text: ko.obs("")
    }
};

$(function () {
    var data = ejs.toJsObject(eval("(" + $("#scrData").html() + ")"));
    var model = new ejs.model({
        sets: [{
            name: "projectDispatches",
            className: "projectDispatch",
            properties: ["projectID", "comments", "projectName", "date", "employeeID", "employeeName", "creatorID", "creator", "amount", "name", "orderID", "orderName"],
            hasMany: [{ name: "products", setName: "productDispatches", fkProperty: "projectDispatchID" }],
            belongs: [{ name: "order", setName: "projectDispatchOrders" }]
        }, {
            name: "projectDispatchOrders",
            className: "projectDispatchOrder",
            properties: ["projectID", "comments", "projectName", "date", "employeeID", "employeeName", "creatorID", "creator", "amount", "name"],
            hasMany: [{ name: "products", setName: "projectProducts", fkProperty: "dispatchID" }]
        }, {
            name: "projects",
            properties: ["fullName", "deleted", "parentName"]
        }, {
            name: "projectProducts",
            properties: ["dispatchID", "productID", "count", "price", "productName", "productCount"],
            belongs: [{ name: "dispatch", setName: "projectDispatchOrders" }, "product"]
        }, {
            name: "productDispatches",
            className: "productDispatch",
            properties: ["projectDispatchID", "productID", "count", "price", "productName", "productCount", "projectProductID", "deleted"],
            belongs: [{ name: "dispatch", setName: "projectDispatches", fkProperty: "projectDispatchID" }, "product"]
        }, {
            name: "products",
            properties: ["name", "count", "sysName", "outerID", "description", "price", "priceSell"],
            belongs: []
        }, {
            name: "employees",
            mode: "autocomplete",
            properties: ["fullName", "deleted", "archived"]
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "projectDispatchOrder") {
            e.ko.include(["products"]);
        } else if (e.className == "projectProduct") {
            e.ko.include(["dispatch", "product"]);
        } else if (e.className == "projectDispatch") {
            e.ko.include(["products", "order"]);
            e.ko.activeProducts = ko.cmp(function () {
                return e.ko.products().where("val=>!val.deleted()");
            });
            e.ko.total = ko.cmp(function () {
                return e.ko.activeProducts().sum("val=>val.count()*val.price()");
            });
            e.ko.readOnly = ko.obs(e.ko.id() > 0 && host.ur != host.roles.admin && e.ko.creatorID() != host.uid);
            e.ko.deletable = ko.obs(!e.ko.readOnly());
            e.ko.orderID.subscribe(function (val) {
                if (!val || e.entity.inParse || !e.ko.order())
                    return;
                var o = e.ko.order();
                koModel.fillDispatch(e.ko, o);
            });
        } else if (e.className == "productDispatch") {
            e.ko.include(["dispatch", "product"]);
            ko.toDobs(e.ko.price);
            e.ko.productID.subscribe(function (val) {
                if (!val || e.entity.inParse || !e.ko.product())
                    return;
                var p = e.ko.product();
                if (p.priceSell() > 0)
                    e.ko.price(p.priceSell());
                e.ko.productCount(p.count());
            });
            e.ko.exists = ko.cmp(function () {
                var d = e.ko.dispatch();
                return d && d.activeProducts().any("val=>val.id()!=" + e.ko.id() + "&&val.productID()=='" + e.ko.productID() + "'");
            });
            e.ko.missing = ko.cmp(function () {
                return false;
            });
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.loadProjects = function (request, callback, row) {
        var name = row.projectName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.projects, where, [ejs.cop("fullName")], 20), function (result) {
            callback(result.collections.projects.select(function (it, i) {
                return { label: it.fullName, value: it.fullName, source: it };
            }));
        });
    };

    koModel.loadProducts = function (request, callback, row) {
        var name = row.productName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [];//ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("name", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.products, where, [ejs.cop("name")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.products.select(function (it, i) {
                return { label: it.name, value: it.name, source: it };
            }));
        });
    };

    koModel.loadEmployees = function (request, callback, row) {
        var name = row.employeeName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }
        var ops = ejs.cso(model.employees, where, [ejs.cop("fullName")], 20);
        model.select(ops, function (result) {
            model.addData(result.collections);
            callback(result.collections.employees.select(function (it, i) {
                return { label: it.fullName, value: it.fullName, source: it };
            }));
        });
    };

    koModel.loadOrders = function (request, callback, row) {
        var name = row.orderName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [];//ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("name", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.projectDispatchOrders, where, [ejs.cop("name")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.projectDispatchOrders.select(function (it, i) {
                return { label: it.name, value: it.name, source: it };
            }));
        });
    };

    koModel.fillDispatch = function (dispatch, order) {
        dispatch.employeeID(order.employeeID())
        dispatch.employeeName(order.employeeName())
        dispatch.projectID(order.projectID());
        dispatch.projectName(order.projectName());
        koModel.fillProducts(dispatch, order);
    };
    koModel.fillProducts = function (dispatch, order) {
        ejs.busy("orderProducts");
        model.projectProducts.getChildren(order.id(), "dispatchID", function (result) {
            ejs.free("orderProducts");
            var products = order.products();
            var oldProducts = dispatch.products();

            for (var i = 0; i < products.length; i++) {
                var p = products[i];
                var dp = oldProducts.first("val=>val.productID()==" + p.productID());
                if (dp == null) {
                    dp = koModel.createProduct(dispatch);
                }

                dp.deleted(false);
                dp.projectProductID(p.id());
                dp.productID(p.productID());
                dp.productName(p.productName());
                dp.count(p.count());
                dp.price(p.price());
                dp.productCount(p.productCount());

                oldProducts.removeEl(dp);
            }
            for (var i = 0; i < oldProducts.length; i++) {
                koModel.removeProduct(oldProducts[i], true);
            }
        }, []);

    };

    koModel.doAction = function (e) {
        koModel.projectDispatchesPager.events.pageChanged.detach(koModel.doAction);
        if ((data.action || "").toLowerCase() == "details" && data.dispatch) {
            model.projectDispatches.addData([data.dispatch]);
            var row = koModel.projectDispatches().first("val=>val.id()==" + data.dispatch.id);
            koModel.editProjectDispatch(row);
        } else if ((data.action || "").toLowerCase() == "create") {
            var row = koModel.createProjectDispatch();
            if (data.order) {
                model.projectDispatchOrders.addData([data.order]);
                row.orderID(data.order.id);
                row.orderName(data.order.name);
            }
        }
    };

    ejs.crud.getDefaultTextProvider = function (options) {
        var provider = new ejs.crud.defaultTextProvider();
        provider.unableDelete = "Вы не можете удалить эту запись!";
        return provider;
    };

    var sn = "/Products/Dispatches#tblProjectDispatches";
    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }

    koModel.dispatchesCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.projectDispatches,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: "#divRightContent",
        gridPadding: 10,
        gridFilter: true,
        container: $("#divProjectDispatches"),
        tdSaveTemplate: "#scrTdSave",
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: 20,
        pure: true,
        selectMany: true,
        excel: "Выдачи",
        orderBy: "ID",
        orderDesc: true,
        columns:
        [{
            title: "ID",
            name: "id",
            type: "number",
            showOnly: true,
            filter: true,
            filterType: "number"
        }, {
            title: "Заказ",
            name: "orderID",
            value: "orderName",
            type: "autocomplete",
            method: "loadOrders",
            orderBy: "order.Name",
            disable: "readOnly",
            filterType: "string",
            filterName: "order.Name",
            required: true,
            filter: true
        }, {
            title: "Проект",
            name: "projectID",
            value: "projectName",
            type: "autocomplete",
            method: "loadProjects",
            orderBy: "project.Name",
            showTemplate: "<a data-bind=\"text: projectName, attr: { href: host.arp + 'Project/Index/' + projectID() }\" target=\"_blank\"></a>",
            disable: "readOnly",
            filterType: "string",
            filterName: "project.Name",
            required: true,
            filter: true
        }, {
            title: "Дата выдачи",
            name: "date",
            type: "date",
            disable: "readOnly",
            defaultValue: new Date().toSds(),
            required: true,
            filter: true,
            filterType: "date"
        }, {
            title: "Получатель",
            name: "employeeID",
            value: "employeeName",
            type: "autocomplete",
            method: "loadEmployees",
            orderBy: "employee.Name",
            disable: "readOnly",
            filterType: "string",
            filterName: "employee.Name",
            required: true,
            filter: true
        }, {
            title: "Примечание",
            name: "comments",
            type: "textarea",
            disable: "readOnly",
            filter: true,
            filterType: "string"
        }, {
            title: "Автор",
            name: "creator",
            type: "string",
            defaultValue: host.login,
            disable: true,
            filter: true,
            filterType: "string"
        }, {
            title: "Сумма",
            name: "amount",
            type: "number",
            showOnly: true,
            filter: true,
            filterType: "number"
        }],
        filters: []
    });

    koModel.projectDispatchesPager.events.pageChanged.attach(koModel.doAction);

    koModel.dispatchesCrud.events.editing.attach(function (e) {
        ejs.busy("productDispatches");
        model.productDispatches.getChildren(e.row.id(), "projectDispatchID", function (result) {
            ejs.free("productDispatches");

            var products = e.row.products();
            for (var i = 0; i < products.length; i++) {
                products[i].entity.backup();
            }
        }, [ejs.cwp("deleted", false, "=", "bool")]);
        var btn = koModel.dispatchesCrud.getEditor().getDialog().parent().find("div.ui-dialog-buttonset button:first");
        if (e.row.readOnly()) {
            btn.hide();
        } else {
            btn.show();
        }
    });
    koModel.dispatchesCrud.events.creating.attach(function (e) {
        var btn = koModel.dispatchesCrud.getEditor().getDialog().parent().find("div.ui-dialog-buttonset button:first");
        btn.show();
    });

    koModel.dispatchesCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });

    koModel.dispatchesCrud.events.updating.attach(function (e) {
        e.row.amount(e.row.total());
        e.row.name(e.row.projectName() + " " + e.row.date());
        var products = e.row.products();
        for (var i = 0; i < products.length; i++) {
            products[i].entity.commit();
        }
    });

    koModel.createProduct = function (dispatch) {
        var row = model.productDispatches.create().toKo();
        row.projectDispatchID(dispatch.id());
        row.count(1);
        return row;
    };
    koModel.removeProduct = function (row, noConfirm) {
        if (row.id() <= 0) {
            row.entity.remove();
            return;
        } else if (!row.productID() || row.count() <= 0 || noConfirm == true) {
            row.entity.restore();
            row.deleted(true);
            return;
        }

        var m = "Вы действительно хотите удалить товар " + row.productName() + "?";
        ejs.confirm("Подтвердите удаление", m, function () {
            koModel.removeProduct(row, true);
        });
    };

    if (!cols) {
        koModel.dispatchesCrud.getPager().refresh();
    }

    var html = $("#scrProducts").html();
    var form = koModel.dispatchesCrud.getEditor().getDialog().find("form");
    form.append(html);

    window.setSize = function () {
        var h = $(window).height();
        var div = $(".right-content .container");
        div.css({ height: h - 40 - div.offset().top + "px" });
    };

    setSize();
    $(window).resize(function () {
        setSize();
    });

    ko.apply(koModel);
});