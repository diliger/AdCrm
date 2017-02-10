var koModel = {
    filter: {
        text: ko.obs("")
    }
};

$(function () {
    var data = ejs.toJsObject(eval("(" + $("#scrData").html() + ")"));
    var model = new ejs.model({
        sets: [{
            name: "projectDispatchOrders",
            className: "projectDispatchOrder",
            properties: ["projectID", "comments", "projectName", "date", "employeeID", "employeeName", "creatorID", "creator", "amount", "name", "statusID"],
            hasMany: [{ name: "products", setName: "projectProducts", fkProperty: "dispatchID" }],
            belongs: [{ name: "status", setName: "statbooks" }]
        }, {
            name: "projects",
            properties: ["fullName", "deleted", "parentName"]
        }, {
            name: "projectProducts",
            properties: ["dispatchID", "productID", "count", "price", "productName", "productCount"],
            belongs: [{ name: "dispatch", setName: "projectDispatchOrders" }, "product"]
        }, {
            name: "products",
            properties: ["name", "count", "sysName", "outerID", "description", "price", "priceSell"],
            belongs: []
        }, {
            name: "employees",
            mode: "autocomplete",
            properties: ["fullName", "deleted", "archived"]
        }, {
            name: "statbooks",
            properties: ["comments", "name", "orderNumber", "typeID", "color"]
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "projectDispatchOrder") {
            e.ko.include(["products", "status"]);
            e.ko.total = ko.cmp(function () {
                return e.ko.products().sum("val=>val.count()*val.price()");
            });
            e.ko.readOnly = ko.obs(e.ko.id() > 0 && host.ur != host.roles.admin && e.ko.creatorID() != host.uid);
            e.ko.deletable = ko.obs(!e.ko.readOnly());
        } else if (e.className == "projectProduct") {
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
                return d && d.products().any("val=>val.id()!=" + e.ko.id() + "&&val.productID()=='" + e.ko.productID() + "'");
            });
            e.ko.missing = ko.cmp(function () {
                return false;
            });
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.dispatchStatuses = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.dispatchStatuses);
    };

    koModel.loadProjects = function (request, callback, row) {
        var name = row.projectName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool"), ejs.cwp("parentID", true, "isNull")];
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

    ejs.crud.getDefaultTextProvider = function (options) {
        var provider = new ejs.crud.defaultTextProvider();
        provider.unableDelete = "Вы не можете удалить эту запись!";
        return provider;
    };

    var sn = "/Products/Orders#tblProjectDispatchOrders";
    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }

    koModel.ordersCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.projectDispatchOrders,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: "#divRightContent",
        gridPadding: 10,
        gridFilter: true,
        container: $("#divProjectDispatchOrders"),
        tdSaveTemplate: "#scrTdSave",
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: 20,
        pure: true,
        orderBy: "ID",
        orderDesc: true,
        selectMany: true,
        excel: "Заказы",
        tdStyle: "backgroundColor: status()?status().color():null",
        columns:
        [{
            title: "ID",
            name: "id",
            type: "number",
            showOnly: true,
            filter: true,
            filterType: "number"
        }, {
            title: "Проект",
            name: "projectID",
            value: "projectName",
            type: "autocomplete",
            method: "loadProjects",
            orderBy: "project.Name",
            showTemplate: "<a data-bind=\"text: projectName, attr: { href: host.arp + 'Project/Index/' + projectID() }\" target=\"_blank\"></a>",
            disable: "readOnly()",
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
            title: "Статус",
            name: "statusID",
            orderBy: "status.Name",
            value: "status().name",
            type: "select",
            options: "dispatchStatuses()",
            filterOptions: "dispatchStatuses()",
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

    koModel.ordersCrud.events.editing.attach(function (e) {
        ejs.busy("projectProducts");
        model.projectProducts.getChildren(e.row.id(), "dispatchID", function (result) {
            ejs.free("projectProducts");
            e.row.products.loaded = true;
        }, []);
        //var btn = koModel.ordersCrud.getEditor().getDialog().parent().find("div.ui-dialog-buttonset button:first");
        //if (e.row.readOnly()) {
        //    btn.hide();
        //} else {
        //    btn.show();
        //}
    });
    koModel.ordersCrud.events.creating.attach(function (e) {
        var btn = koModel.ordersCrud.getEditor().getDialog().parent().find("div.ui-dialog-buttonset button:first");
        btn.show();
    });

    koModel.ordersCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });

    koModel.ordersCrud.events.updating.attach(function (e) {
        e.row.amount(e.row.total());
        e.row.name(e.row.projectName() + " " + e.row.date());
    });

    koModel.createProduct = function (dispatch) {
        var row = model.projectProducts.create().toKo();
        row.dispatchID(dispatch.id());
        row.count(1);
        return row;
    };
    koModel.removeProduct = function (row) {
        if (!row.productID() || row.id() <= 0 || row.count() <= 0) {
            row.entity.remove();
            return;
        }

        var m = "Вы действительно хотите удалить товар " + row.productName() + "?";
        ejs.confirm("Подтвердите удаление", m, function () {
            row.entity.remove();
            return;
        });
    };

    koModel.copyOrder = function (row) {
        var order = koModel.createProjectDispatchOrder();
        var fn = function (newOrder, oldOrder) {
            var products = oldOrder.products();
            for (var i = 0; i < products.length; i++) {
                var p = products[i];
                var np = koModel.createProduct(order);
                np.productID(p.productID());
                np.productName(p.productName());
                np.count(p.count());
                np.price(p.price());
            }
        };
        if (row.products.loaded || row.products().any()) {
            fn(order, row);
        } else {
            ejs.busy("projectProducts");
            model.projectProducts.select(function (result) {
                ejs.free("projectProducts");
                row.products.loaded = true;
                fn(order, row);
            }, [ejs.cwp("dispatchID", row.id(), "=", "number")], "", "", "", "", "", [ejs.cip(model.products)]);
        }
    };

    if (!cols) {
        koModel.ordersCrud.getPager().refresh();
    }

    var html = $("#scrProducts").html();
    var form = koModel.ordersCrud.getEditor().getDialog().find("form");
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